# NFS Configuration Guide for GrepMind Dashboard

## Overview

This guide provides detailed instructions for setting up and configuring NFS (Network File System) storage for the GrepMind Dashboard PostgreSQL database.

## 📋 Prerequisites

- NFS Server: `10.0.0.20`
- NFS Path: `/srv/nfs/kubedata/postgres`
- Kubernetes cluster with NFS client support
- Proper network connectivity between Kubernetes nodes and NFS server

## 🔧 NFS Server Setup

### 1. Install NFS Server (Ubuntu/Debian)

```bash
# Install NFS server
sudo apt update
sudo apt install nfs-kernel-server

# Create the export directory
sudo mkdir -p /srv/nfs/kubedata/postgres
sudo chown nobody:nogroup /srv/nfs/kubedata/postgres
sudo chmod 755 /srv/nfs/kubedata/postgres
```

### 2. Configure NFS Exports

```bash
# Edit exports file
sudo nano /etc/exports

# Add the following line (adjust IP range as needed)
/srv/nfs/kubedata/postgres 10.0.0.0/24(rw,sync,no_subtree_check,no_root_squash)

# Apply the configuration
sudo exportfs -a
sudo systemctl restart nfs-kernel-server
```

### 3. Firewall Configuration

```bash
# Allow NFS traffic (Ubuntu/Debian with ufw)
sudo ufw allow from 10.0.0.0/24 to any port nfs
sudo ufw allow from 10.0.0.0/24 to any port 111
sudo ufw allow from 10.0.0.0/24 to any port 2049

# Or for iptables
sudo iptables -A INPUT -s 10.0.0.0/24 -p tcp --dport 111 -j ACCEPT
sudo iptables -A INPUT -s 10.0.0.0/24 -p tcp --dport 2049 -j ACCEPT
sudo iptables -A INPUT -s 10.0.0.0/24 -p udp --dport 111 -j ACCEPT
sudo iptables -A INPUT -s 10.0.0.0/24 -p udp --dport 2049 -j ACCEPT
```

## 🔎 Client Configuration

### 1. Install NFS Client on Kubernetes Nodes

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nfs-common

# CentOS/RHEL
sudo yum install nfs-utils

# Or using dnf
sudo dnf install nfs-utils
```

### 2. Test NFS Mount

```bash
# Create test mount point
sudo mkdir -p /mnt/test-nfs

# Test mount
sudo mount -t nfs 10.0.0.20:/srv/nfs/kubedata/postgres /mnt/test-nfs

# Verify mount
df -h | grep nfs
ls -la /mnt/test-nfs

# Test write permissions
sudo touch /mnt/test-nfs/test-file
ls -la /mnt/test-nfs/

# Clean up
sudo rm /mnt/test-nfs/test-file
sudo umount /mnt/test-nfs
sudo rmdir /mnt/test-nfs
```

## ⚙️ Kubernetes Configuration

### 1. Storage Class

```yaml
# k8s/nfs-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-storage
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Retain
allowVolumeExpansion: true
mountOptions:
  - nfsvers=4.1
  - hard
  - intr
  - rsize=1048576
  - wsize=1048576
  - timeo=600
  - retrans=2
```

### 2. Apply Storage Class

```bash
kubectl apply -f k8s/nfs-storageclass.yaml
kubectl get storageclass
```

### 3. Persistent Volume Configuration

The Helm chart automatically creates the PV with these specifications:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: grepmind-dashboard-postgresql-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: nfs-storage
  nfs:
    server: 10.0.0.20
    path: /srv/nfs/kubedata/postgres
  mountOptions:
    - nfsvers=4.1
    - hard
    - intr
```

## 🔒 Security Considerations

### 1. NFS Security Options

```bash
# Secure NFS exports configuration
/srv/nfs/kubedata/postgres 10.0.0.0/24(rw,sync,no_subtree_check,root_squash,secure)
```

### 2. Network Security

- Use VPN or private networks
- Implement firewall rules
- Consider NFS over TLS (NFSv4.2)
- Regular security audits

### 3. Access Control

```bash
# Set proper ownership and permissions
sudo chown 999:999 /srv/nfs/kubedata/postgres  # PostgreSQL user
sudo chmod 700 /srv/nfs/kubedata/postgres
```

## 🗺️ Performance Tuning

### 1. NFS Mount Options

```yaml
mountOptions:
  - nfsvers=4.1          # Use NFSv4.1 for better performance
  - hard                 # Hard mount for reliability
  - intr                 # Allow interruption
  - rsize=1048576       # 1MB read size
  - wsize=1048576       # 1MB write size
  - timeo=600           # 60 second timeout
  - retrans=2           # 2 retransmissions
  - ac                  # Enable attribute caching
  - acregmin=3          # Minimum time to cache file attributes
  - acregmax=60         # Maximum time to cache file attributes
```

### 2. NFS Server Tuning

```bash
# Increase NFS daemon threads
echo 'RPCNFSDCOUNT=16' >> /etc/default/nfs-kernel-server

# Tune network buffer sizes
echo 'net.core.rmem_default = 262144' >> /etc/sysctl.conf
echo 'net.core.rmem_max = 16777216' >> /etc/sysctl.conf
echo 'net.core.wmem_default = 262144' >> /etc/sysctl.conf
echo 'net.core.wmem_max = 16777216' >> /etc/sysctl.conf

# Apply changes
sudo sysctl -p
sudo systemctl restart nfs-kernel-server
```

## 🔍 Troubleshooting

### 1. Common Issues

#### Mount Timeout
```bash
# Check NFS server status
sudo systemctl status nfs-kernel-server
sudo showmount -e 10.0.0.20

# Test network connectivity
ping 10.0.0.20
telnet 10.0.0.20 2049
```

#### Permission Denied
```bash
# Check export configuration
sudo exportfs -v

# Check directory permissions
sudo ls -la /srv/nfs/kubedata/

# Check SELinux (if applicable)
sudo setsebool -P nfs_export_all_rw 1
```

#### Stale File Handle
```bash
# Unmount and remount
sudo umount /mnt/nfs-mount
sudo mount -t nfs 10.0.0.20:/srv/nfs/kubedata/postgres /mnt/nfs-mount

# Or restart NFS client services
sudo systemctl restart nfs-common
```

### 2. Debug Commands

```bash
# Check NFS statistics
nfsstat -c  # Client stats
nfsstat -s  # Server stats

# Monitor NFS traffic
sudo tcpdump -i any port 2049

# Check mounted filesystems
mount | grep nfs
df -t nfs

# NFS client debug
sudo mount -t nfs -o nfsvers=4.1,debug 10.0.0.20:/srv/nfs/kubedata/postgres /mnt/debug
```

### 3. Kubernetes Debugging

```bash
# Check storage class
kubectl get storageclass nfs-storage -o yaml

# Check persistent volumes
kubectl get pv,pvc
kubectl describe pv grepmind-dashboard-postgresql-pv

# Check pod events
kubectl describe pod grepmind-dashboard-postgresql-xxx

# Test NFS from pod
kubectl run nfs-test --image=busybox --restart=Never -- \
  sh -c "mount -t nfs 10.0.0.20:/srv/nfs/kubedata/postgres /mnt && ls -la /mnt"
```

## 🔄 Backup and Recovery

### 1. NFS Backup Strategy

```bash
# Snapshot backup (if supported)
sudo lvcreate -L1G -s -n postgres-snapshot /dev/vg0/nfs-lv

# Rsync backup
sudo rsync -av /srv/nfs/kubedata/postgres/ /backup/postgres-$(date +%Y%m%d)/

# Tar backup
sudo tar -czf /backup/postgres-$(date +%Y%m%d).tar.gz -C /srv/nfs/kubedata postgres/
```

### 2. Recovery Procedures

```bash
# Stop PostgreSQL pod
kubectl scale deployment grepmind-dashboard-postgresql --replicas=0

# Restore from backup
sudo rm -rf /srv/nfs/kubedata/postgres/*
sudo tar -xzf /backup/postgres-20240101.tar.gz -C /srv/nfs/kubedata/

# Fix permissions
sudo chown -R 999:999 /srv/nfs/kubedata/postgres

# Restart PostgreSQL
kubectl scale deployment grepmind-dashboard-postgresql --replicas=1
```

## 🎯 Best Practices

1. **Regular Monitoring**: Monitor NFS performance and availability
2. **Backup Strategy**: Implement automated backup procedures
3. **Security Updates**: Keep NFS server and clients updated
4. **Network Redundancy**: Consider multiple NFS servers for HA
5. **Performance Testing**: Regular performance testing under load
6. **Documentation**: Maintain detailed configuration documentation

---

📚 For more information, see the [official NFS documentation](https://nfs.sourceforge.net/) and [Kubernetes storage documentation](https://kubernetes.io/docs/concepts/storage/).
