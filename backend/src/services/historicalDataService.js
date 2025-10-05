import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { getKubernetesClient } from '../config/kubernetes.js';

class HistoricalDataService {
  constructor() {
    this.prisma = new PrismaClient();
    this.collectionInterval = null;
    this.aggregationInterval = null;
    this.cleanupInterval = null;
    this.isCollecting = false;
    this.retentionPolicies = {
      raw: 24 * 60 * 60 * 1000, // 24 hours for raw data
      hourly: 7 * 24 * 60 * 60 * 1000, // 7 days for hourly aggregates
      daily: 30 * 24 * 60 * 60 * 1000, // 30 days for daily aggregates
      monthly: 365 * 24 * 60 * 60 * 1000 // 1 year for monthly aggregates
    };
  }

  /**
   * Initialize the historical data service
   */
  async initialize() {
    try {
      await this.startDataCollection();
      await this.startAggregationJobs();
      await this.startCleanupJobs();
      
      logger.info('✅ Historical data service initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize historical data service:', error);
      throw error;
    }
  }

  /**
   * Start collecting metrics data every 30 seconds
   */
  async startDataCollection() {
    if (this.isCollecting) return;
    
    this.isCollecting = true;
    
    // Collect metrics every 30 seconds
    this.collectionInterval = setInterval(async () => {
      await this.collectCurrentMetrics();
    }, 30000);
    
    logger.info('🚀 Started metrics data collection (30s interval)');
  }

  /**
   * Collect current cluster metrics and store them
   */
  async collectCurrentMetrics() {
    try {
      const { coreApi, appsApi } = getKubernetesClient();
      const timestamp = new Date();
      
      // Get cluster overview
      const [nodesRes, podsRes] = await Promise.allSettled([
        coreApi.listNode(),
        coreApi.listPodForAllNamespaces()
      ]);

      if (nodesRes.status === 'fulfilled') {
        const nodes = nodesRes.value.body.items;
        
        // Store cluster-wide node metrics
        await this.prisma.monitoringMetrics.create({
          data: {
            timestamp,
            metricType: 'nodes_total',
            value: nodes.length,
            unit: 'count',
            labels: { type: 'cluster' }
          }
        });

        const readyNodes = nodes.filter(node => 
          node.status.conditions?.find(c => c.type === 'Ready')?.status === 'True'
        ).length;

        await this.prisma.monitoringMetrics.create({
          data: {
            timestamp,
            metricType: 'nodes_ready',
            value: readyNodes,
            percentage: (readyNodes / nodes.length) * 100,
            unit: 'count',
            labels: { type: 'cluster' }
          }
        });

        // Store per-node metrics
        for (const node of nodes) {
          const readyCondition = node.status.conditions?.find(c => c.type === 'Ready');
          const isReady = readyCondition?.status === 'True';
          
          // Calculate node resource usage
          let cpuCapacity = parseFloat(node.status.capacity?.cpu || 0);
          let memoryCapacityKi = parseFloat((node.status.capacity?.memory || '0Ki').replace(/[^\d.]/g, ''));
          let memoryCapacityMi = memoryCapacityKi / 1024;

          await this.prisma.monitoringMetrics.createMany({
            data: [
              {
                timestamp,
                metricType: 'node_cpu_capacity',
                resourceName: node.metadata.name,
                value: cpuCapacity,
                unit: 'cores',
                labels: { 
                  nodeType: 'cluster_node',
                  status: isReady ? 'ready' : 'not_ready'
                }
              },
              {
                timestamp,
                metricType: 'node_memory_capacity',
                resourceName: node.metadata.name,
                value: memoryCapacityMi,
                unit: 'MB',
                labels: { 
                  nodeType: 'cluster_node',
                  status: isReady ? 'ready' : 'not_ready'
                }
              }
            ]
          });
        }
      }

      if (podsRes.status === 'fulfilled') {
        const pods = podsRes.value.body.items;
        
        // Store cluster-wide pod metrics
        await this.prisma.monitoringMetrics.create({
          data: {
            timestamp,
            metricType: 'pods_total',
            value: pods.length,
            unit: 'count',
            labels: { type: 'cluster' }
          }
        });

        const runningPods = pods.filter(pod => pod.status.phase === 'Running').length;
        await this.prisma.monitoringMetrics.create({
          data: {
            timestamp,
            metricType: 'pods_running',
            value: runningPods,
            percentage: (runningPods / pods.length) * 100,
            unit: 'count',
            labels: { type: 'cluster' }
          }
        });

        // Store per-namespace pod counts
        const namespaceStats = {};
        pods.forEach(pod => {
          const ns = pod.metadata.namespace;
          if (!namespaceStats[ns]) {
            namespaceStats[ns] = { total: 0, running: 0, pending: 0, failed: 0 };
          }
          namespaceStats[ns].total++;
          if (pod.status.phase === 'Running') namespaceStats[ns].running++;
          if (pod.status.phase === 'Pending') namespaceStats[ns].pending++;
          if (pod.status.phase === 'Failed') namespaceStats[ns].failed++;
        });

        for (const [namespace, stats] of Object.entries(namespaceStats)) {
          await this.prisma.monitoringMetrics.createMany({
            data: [
              {
                timestamp,
                metricType: 'namespace_pods_total',
                namespace,
                value: stats.total,
                unit: 'count',
                labels: { type: 'namespace' }
              },
              {
                timestamp,
                metricType: 'namespace_pods_running',
                namespace,
                value: stats.running,
                percentage: (stats.running / stats.total) * 100,
                unit: 'count',
                labels: { type: 'namespace' }
              }
            ]
          });
        }
      }

    } catch (error) {
      logger.error('❌ Error collecting metrics:', error);
    }
  }

  /**
   * Start aggregation jobs
   */
  async startAggregationJobs() {
    // Run aggregation every hour
    this.aggregationInterval = setInterval(async () => {
      await this.runAggregationJobs();
    }, 60 * 60 * 1000); // 1 hour

    logger.info('📊 Started aggregation jobs (1h interval)');
  }

  /**
   * Run aggregation jobs for historical data
   */
  async runAggregationJobs() {
    try {
      const now = new Date();
      
      // Hourly aggregation
      await this.aggregateMetrics('hourly', new Date(now.getTime() - 60 * 60 * 1000), now);
      
      // Daily aggregation (if it's a new day)
      if (now.getHours() === 0) {
        await this.aggregateMetrics('daily', new Date(now.getTime() - 24 * 60 * 60 * 1000), now);
      }
      
      // Monthly aggregation (if it's a new month)
      if (now.getDate() === 1 && now.getHours() === 0) {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        await this.aggregateMetrics('monthly', lastMonth, now);
      }
      
    } catch (error) {
      logger.error('❌ Error in aggregation jobs:', error);
    }
  }

  /**
   * Aggregate metrics for a specific time interval
   */
  async aggregateMetrics(interval, startTime, endTime) {
    try {
      const metrics = await this.prisma.monitoringMetrics.groupBy({
        by: ['metricType', 'namespace', 'resourceName'],
        where: {
          timestamp: {
            gte: startTime,
            lt: endTime
          }
        },
        _avg: { value: true, percentage: true },
        _min: { value: true },
        _max: { value: true },
        _count: { id: true }
      });

      for (const metric of metrics) {
        await this.prisma.monitoringAggregates.upsert({
          where: {
            timestamp_interval_metricType_namespace_resourceName: {
              timestamp: startTime,
              interval,
              metricType: metric.metricType,
              namespace: metric.namespace,
              resourceName: metric.resourceName
            }
          },
          update: {
            avgValue: metric._avg.value || 0,
            minValue: metric._min.value || 0,
            maxValue: metric._max.value || 0,
            samples: metric._count.id
          },
          create: {
            timestamp: startTime,
            interval,
            metricType: metric.metricType,
            namespace: metric.namespace,
            resourceName: metric.resourceName,
            avgValue: metric._avg.value || 0,
            minValue: metric._min.value || 0,
            maxValue: metric._max.value || 0,
            samples: metric._count.id
          }
        });
      }

      logger.info(`📊 Completed ${interval} aggregation for ${metrics.length} metric groups`);

    } catch (error) {
      logger.error(`❌ Error aggregating ${interval} metrics:`, error);
    }
  }

  /**
   * Start cleanup jobs
   */
  async startCleanupJobs() {
    // Run cleanup every 6 hours
    this.cleanupInterval = setInterval(async () => {
      await this.runCleanupJobs();
    }, 6 * 60 * 60 * 1000); // 6 hours

    logger.info('🧹 Started cleanup jobs (6h interval)');
  }

  /**
   * Run cleanup jobs based on retention policies
   */
  async runCleanupJobs() {
    try {
      const now = new Date();
      
      // Clean up raw metrics older than 24 hours
      const rawCutoff = new Date(now.getTime() - this.retentionPolicies.raw);
      const deletedRaw = await this.prisma.monitoringMetrics.deleteMany({
        where: {
          timestamp: { lt: rawCutoff }
        }
      });

      // Clean up hourly aggregates older than 7 days
      const hourlyCutoff = new Date(now.getTime() - this.retentionPolicies.hourly);
      const deletedHourly = await this.prisma.monitoringAggregates.deleteMany({
        where: {
          interval: 'hourly',
          timestamp: { lt: hourlyCutoff }
        }
      });

      // Clean up daily aggregates older than 30 days
      const dailyCutoff = new Date(now.getTime() - this.retentionPolicies.daily);
      const deletedDaily = await this.prisma.monitoringAggregates.deleteMany({
        where: {
          interval: 'daily',
          timestamp: { lt: dailyCutoff }
        }
      });

      logger.info(`🧹 Cleanup completed: ${deletedRaw.count} raw, ${deletedHourly.count} hourly, ${deletedDaily.count} daily records deleted`);

    } catch (error) {
      logger.error('❌ Error in cleanup jobs:', error);
    }
  }

  /**
   * Get historical data for a specific metric
   */
  async getHistoricalData(metricType, timeRange = '1h', namespace = null, resourceName = null) {
    try {
      const now = new Date();
      let startTime;
      let useAggregates = false;
      let interval = null;

      // Determine time range and whether to use aggregates
      switch (timeRange) {
        case '1h':
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '6h':
          startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
          break;
        case '24h':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          useAggregates = true;
          interval = 'hourly';
          break;
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          useAggregates = true;
          interval = 'daily';
          break;
        case '30d':
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          useAggregates = true;
          interval = 'daily';
          break;
        default:
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
      }

      let data;

      if (useAggregates && interval) {
        // Use aggregated data
        data = await this.prisma.monitoringAggregates.findMany({
          where: {
            metricType,
            interval,
            timestamp: { gte: startTime },
            ...(namespace && { namespace }),
            ...(resourceName && { resourceName })
          },
          orderBy: { timestamp: 'asc' },
          select: {
            timestamp: true,
            avgValue: true,
            minValue: true,
            maxValue: true,
            samples: true
          }
        });

        return data.map(d => ({
          timestamp: d.timestamp,
          value: d.avgValue,
          min: d.minValue,
          max: d.maxValue,
          samples: d.samples
        }));
      } else {
        // Use raw data
        data = await this.prisma.monitoringMetrics.findMany({
          where: {
            metricType,
            timestamp: { gte: startTime },
            ...(namespace && { namespace }),
            ...(resourceName && { resourceName })
          },
          orderBy: { timestamp: 'asc' },
          select: {
            timestamp: true,
            value: true,
            percentage: true,
            unit: true
          }
        });

        return data.map(d => ({
          timestamp: d.timestamp,
          value: d.value,
          percentage: d.percentage,
          unit: d.unit
        }));
      }

    } catch (error) {
      logger.error('❌ Error getting historical data:', error);
      throw error;
    }
  }

  /**
   * Get metrics summary for dashboard
   */
  async getMetricsSummary(timeRange = '1h') {
    try {
      const historicalData = await Promise.all([
        this.getHistoricalData('nodes_total', timeRange),
        this.getHistoricalData('pods_total', timeRange),
        this.getHistoricalData('pods_running', timeRange),
      ]);

      return {
        nodes: historicalData[0],
        pods: {
          total: historicalData[1],
          running: historicalData[2]
        },
        timeRange
      };

    } catch (error) {
      logger.error('❌ Error getting metrics summary:', error);
      throw error;
    }
  }

  /**
   * Stop all data collection and cleanup
   */
  async stop() {
    logger.info('🔄 Stopping historical data service...');
    
    this.isCollecting = false;
    
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
      this.aggregationInterval = null;
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    await this.prisma.$disconnect();
    
    logger.info('✅ Historical data service stopped');
  }
}

export default new HistoricalDataService();