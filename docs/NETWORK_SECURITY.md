# Network Security & Firewall Configuration

> Complete guide for configuring firewalls, routers, and VPS security for AgentLink Protocol

---

## Quick Start

**Default Port:** `9100/TCP` and `9100/UDP` (for QUIC)

### For Local Testing (Same Network)
No firewall configuration needed - agents discover each other via mDNS.

### For Internet Communication
Open port `9100` on your firewall/router/VPS.

---

## Port Requirements

### Required Ports

| Port | Protocol | Purpose | Required |
|------|----------|---------|----------|
| `9100` | TCP | Primary P2P communication | ✅ Yes |
| `9100` | UDP | QUIC transport (faster) | ✅ Recommended |
| `9101` | TCP | Alternative/Secondary | ⚠️ Optional |
| `9101` | UDP | QUIC alternative | ⚠️ Optional |

### Default Configuration

```typescript
const agent = new AgentLinkNode({
  name: "My Agent",
  listenPort: 9100,        // Default port
  enableQUIC: true,        // Uses UDP
  enableTCP: true,         // Uses TCP
});
```

---

## Firewall Configuration

### Linux (UFW - Ubuntu/Debian)

```bash
# Allow AgentLink default port
sudo ufw allow 9100/tcp comment "AgentLink Protocol TCP"
sudo ufw allow 9100/udp comment "AgentLink Protocol QUIC"

# Verify rules
sudo ufw status verbose

# Reload UFW
sudo ufw reload
```

### Linux (firewalld - CentOS/RHEL)

```bash
# Add permanent rules
sudo firewall-cmd --permanent --add-port=9100/tcp
sudo firewall-cmd --permanent --add-port=9100/udp

# Reload firewall
sudo firewall-cmd --reload

# Verify
sudo firewall-cmd --list-all
```

### Linux (iptables)

```bash
# Allow AgentLink ports
sudo iptables -A INPUT -p tcp --dport 9100 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 9100 -j ACCEPT

# Save rules (Debian/Ubuntu)
sudo iptables-save | sudo tee /etc/iptables/rules.v4

# Save rules (CentOS/RHEL)
sudo service iptables save
```

### Windows Firewall

```powershell
# Create inbound rule for TCP
New-NetFirewallRule -DisplayName "AgentLink TCP" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 9100 `
  -Action Allow

# Create inbound rule for UDP (QUIC)
New-NetFirewallRule -DisplayName "AgentLink QUIC" `
  -Direction Inbound `
  -Protocol UDP `
  -LocalPort 9100 `
  -Action Allow
```

### macOS Firewall

```bash
# Using socketfilterfw (built-in firewall)
/usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
/usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/node
```

---

## Router Configuration (Port Forwarding)

### For Home/Office Network

If your agent runs behind a router/NAT:

1. **Access Router Admin Panel**
   - URL: `http://192.168.1.1` or `http://192.168.0.1`
   - Login: Check router label/manual

2. **Find Port Forwarding Section**
   - Usually under: Advanced → NAT → Port Forwarding
   - Or: Advanced → Port Forwarding / Virtual Server

3. **Add Port Forwarding Rule**

   | Field | Value |
   |-------|-------|
   | Service Name | AgentLink |
   | Protocol | TCP + UDP (or BOTH) |
   | External Port | 9100 |
   | Internal Port | 9100 |
   | Internal IP | 192.168.x.x (your agent's IP) |
   | Status | Enabled |

4. **Find Your Agent's Local IP**

   ```bash
   # Linux/macOS
   ip addr show | grep "inet "
   
   # Windows
   ipconfig
   ```

5. **Save and Apply**

---

## VPS Configuration

### AWS EC2

1. **Security Groups**
   - Go to EC2 Dashboard → Security Groups
   - Select your instance's security group
   - Add inbound rules:

   | Type | Protocol | Port Range | Source |
   |------|----------|------------|--------|
   | Custom TCP | TCP | 9100 | 0.0.0.0/0 |
   | Custom UDP | UDP | 9100 | 0.0.0.0/0 |

2. **Save Rules**

### Google Cloud Platform

1. **Firewall Rules**
   - Go to VPC Network → Firewall
   - Create firewall rule:
   
   ```
   Name: allow-agentlink
   Priority: 1000
   Direction: Ingress
   Targets: All instances in network
   Source filter: IP ranges
   Source IP ranges: 0.0.0.0/0
   Protocols: tcp:9100, udp:9100
   ```

2. **Apply**

### DigitalOcean

1. **Firewall**
   - Go to Networking → Firewalls
   - Create firewall or edit existing
   - Add inbound rules:

   | Protocol | Port | Sources |
   |----------|------|---------|
   | TCP | 9100 | All IPv4 |
   | UDP | 9100 | All IPv4 |

2. **Apply to Droplet**

### Azure

1. **Network Security Group**
   - Go to VM → Networking
   - Add inbound port rule:

   ```
   Source: Any
   Destination: Any
   Service: Custom
   Protocol: TCP/UDP
   Port: 9100
   Action: Allow
   Priority: 100
   Name: Allow-AgentLink
   ```

---

## Security Best Practices

### 1. Use Non-Standard Ports (Optional)

For production, consider using a non-standard port:

```typescript
const agent = new AgentLinkNode({
  name: "My Agent",
  listenPort: 19847,  // Non-standard port
});
```

**Benefits:**
- Less automated scanning
- Security through obscurity (additional layer only)

### 2. Enable Rate Limiting

AgentLink includes built-in rate limiting:

```typescript
const agent = new AgentLinkNode({
  name: "My Agent",
  // Rate limiting enabled by default
  // 100 messages/minute
  // 30 connections/minute
});
```

### 3. Configure Trust Levels

Always start with conservative trust levels:

```typescript
await contacts.add({
  did: 'did:key:z6Mk...',
  name: 'Unknown Agent',
  trustLevel: 'ask',  // Require approval
});

// Only upgrade to 'trusted' after verification
await contacts.setTrustLevel(did, 'trusted');
```

### 4. Enable Encrypted Storage

```typescript
const password = process.env.AGENTLINK_PASSWORD;
const identity = await getOrCreateIdentity(process.cwd(), password);
await saveIdentitySecure(identity, password);
```

### 5. Monitor Connections

```typescript
const libp2p = agent.getLibp2p();
const connections = libp2p.getConnections();
console.log(`Active connections: ${connections.length}`);

// Log new connections
agent.on('connection', (connection) => {
  console.log('New connection from:', connection.remoteAddr);
});
```

### 6. Use TLS/HTTPS for Dashboard (if applicable)

If you run a web dashboard, always use HTTPS.

### 7. Regular Security Updates

```bash
# Update AgentLink regularly
npm update @dolutech/agent-link

# Check for vulnerabilities
npm audit
```

### 8. Backup Identities Securely

```bash
# Backup encrypted identity
cp -r ~/.agentlink /secure/backup/location

# Set restrictive permissions
chmod 700 /secure/backup/location
chmod 600 /secure/backup/location/*.enc
```

### 9. Use Fail2Ban (Linux)

Install fail2ban to block suspicious activity:

```bash
# Install fail2ban
sudo apt-get install fail2ban

# Create AgentLink jail
sudo nano /etc/fail2ban/jail.d/agentlink.conf
```

```ini
[agentlink]
enabled = true
port = 9100
filter = agentlink
logpath = /var/log/agentlink/*.log
maxretry = 10
bantime = 3600
```

### 10. Disable Unused Features

```typescript
const agent = new AgentLinkNode({
  name: "My Agent",
  enableMdns: false,    // Disable if not on LAN
  enableDHT: true,      // Keep for internet discovery
  enableRelay: true,    // Keep for NAT fallback
  enableDcutr: true,    // Keep for hole punching
});
```

---

## Testing Connectivity

### Test 1: Local Network

```bash
# Start agent
npx @agentlink/cli start

# Check if listening
netstat -tulpn | grep 9100
# or
ss -tulpn | grep 9100
```

Expected output:
```
tcp   LISTEN  0  128  *:9100  *:*  users:(("node",pid=1234,fd=20))
udp   UNCONN  0  0    *:9100  *:*  users:(("node",pid=1234,fd=21))
```

### Test 2: From Another Machine

```bash
# Test TCP connection
telnet <agent-ip> 9100

# Test with nc (netcat)
nc -zv <agent-ip> 9100

# Test UDP (QUIC)
nc -uvz <agent-ip> 9100
```

### Test 3: Online Port Checker

Use online tools to verify port is open:
- https://www.yougetsignal.com/tools/open-ports/
- https://canyouseeme.org/

Enter port `9100` and check if open.

---

## Troubleshooting

### Issue: Port Already in Use

```bash
# Find what's using port 9100
sudo lsof -i :9100
# or
sudo netstat -tulpn | grep 9100

# Kill the process
sudo kill -9 <PID>
```

### Issue: Connection Refused

1. **Check firewall**:
   ```bash
   sudo ufw status
   ```

2. **Check agent is running**:
   ```bash
   systemctl status agentlink
   # or
   ps aux | grep agentlink
   ```

3. **Check port is listening**:
   ```bash
   netstat -tulpn | grep 9100
   ```

### Issue: NAT Traversal Fails

1. **Enable relay**:
   ```typescript
   enableRelay: true
   ```

2. **Check AutoNAT status**:
   ```typescript
   const natStatus = await checkNATStatus(agent.getLibp2p());
   console.log('Behind NAT:', natStatus.behindNAT);
   ```

3. **Configure bootstrap peers**:
   ```typescript
   const agent = new AgentLinkNode({
     bootstrapPeers: [
       '/ip4/bootstrap.agentlink.dolutech.com/tcp/9100/p2p/12D3KooW...'
     ]
   });
   ```

### Issue: High Latency

1. **Enable QUIC** (faster than TCP):
   ```typescript
   enableQUIC: true
   ```

2. **Use geographically closer bootstrap peers**

3. **Check network route**:
   ```bash
   traceroute <destination-ip>
   ```

---

## Quick Reference

### Firewall Commands Summary

```bash
# UFW (Ubuntu)
sudo ufw allow 9100/tcp
sudo ufw allow 9100/udp

# firewalld (CentOS)
sudo firewall-cmd --permanent --add-port=9100/tcp
sudo firewall-cmd --permanent --add-port=9100/udp
sudo firewall-cmd --reload

# iptables
sudo iptables -A INPUT -p tcp --dport 9100 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 9100 -j ACCEPT
```

### Port Check Commands

```bash
# Check if listening
netstat -tulpn | grep 9100

# Test TCP
telnet localhost 9100

# Test UDP
nc -uvz localhost 9100
```

---

## Support

**Security Issues:** [security@dolutech.com](mailto:security@dolutech.com)

**Documentation:** https://github.com/dolutech/agent-link/tree/main/docs

**GitHub Issues:** https://github.com/dolutech/agent-link/issues

---

**DoluTech © 2026**
