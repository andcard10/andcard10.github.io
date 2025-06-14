# 🚀 Azure VNet Peering & Routing Tutorial

> **Author:** Andres Bravo  
> **Level:** Beginner to Intermediate  
> **Last Updated:** 2024

---

## 📑 Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Architecture Overview](#architecture-overview)
4. [Preparing Your Azure Environment](#preparing-your-azure-environment)
5. [Creating Virtual Networks (VNets) and Subnets](#creating-virtual-networks-vnets-and-subnets)
6. [Deploying Test Virtual Machines (VMs)](#deploying-test-virtual-machines-vms)
7. [Configuring VNet Peering](#configuring-vnet-peering)
8. [Testing Basic Connectivity](#testing-basic-connectivity)
9. [Advanced: Routing Traffic via a Network Virtual Appliance (NVA)](#advanced-routing-traffic-via-a-network-virtual-appliance-nva)
10. [Clean Up Resources](#clean-up-resources)
11. [Conclusion](#conclusion)

---

## 📝 Introduction

Welcome! This tutorial will guide you through setting up **VNet Peering** between two Azure Virtual Networks, deploying test Virtual Machines, and optionally configuring **User Defined Routes (UDRs)** to direct traffic through a Network Virtual Appliance (NVA).  
By the end, you'll have a practical understanding of these core Azure networking concepts.

---

## ✅ Prerequisites

- [x] An active Azure Subscription (a free trial is sufficient)
- [x] Access to the Azure Portal

---

## 🗺️ Architecture Overview

We will build the following:

- **VNet-A-Tutorial:** `10.0.0.0/16`
    - **Subnet-A1-Tutorial:** `10.0.1.0/24` (for VM-A)
    - **(Optional) NVA-Subnet-Tutorial:** `10.0.2.0/24` (for NVA)
- **VNet-B-Tutorial:** `10.1.0.0/16`
    - **Subnet-B1-Tutorial:** `10.1.1.0/24` (for VM-B)
- **VM-A-Tutorial:** Test VM in Subnet-A1-Tutorial
- **VM-B-Tutorial:** Test VM in Subnet-B1-Tutorial
- **(Optional) NVA-Tutorial:** A simple Linux VM acting as an NVA
- **VNet Peering:** Connecting VNet-A-Tutorial and VNet-B-Tutorial
- **(Optional) Route Table & UDR:** To route traffic from Subnet-B1-Tutorial through NVA-Tutorial

![Architecture Diagram](images/project-one/Project%20one%20diagram.drawio.png)

---

## 🛠️ Preparing Your Azure Environment

### 1. Sign in to the Azure Portal

1. Open your web browser and navigate to [https://portal.azure.com](https://portal.azure.com).
2. Sign in with your Azure account credentials.  
   ![Azure Portal Login](images/project-one/vnet-peering-tutorial/img%201.png)

### 2. Create a Resource Group

A resource group is a container that holds related resources for an Azure solution.

1. In the Azure portal search bar at the top, type **Resource groups** and select it.
2. Click **+ Create**.
3. On the "Basics" tab:
    - **Subscription:** Select your Azure subscription.
    - **Resource group:** Enter a name, e.g., `VNet-Peering-Tutorial-RG`.
    - **Region:** Select a region (e.g., "Brazil South").  
      ![Resource Group Basics](images/project-one/vnet-peering-tutorial/img%203.png)
4. Click **Review + create** and then **Create**.

---

## 🌐 Creating Virtual Networks (VNets) and Subnets

### 1. Create VNet-A-Tutorial

1. In the Azure portal search bar, type **Virtual networks** and select it.
2. Click **+ Create**.
3. On the **Basics** tab:
    - **Resource group:** Select `VNet-Peering-Tutorial-RG`.
    - **Name:** `VNet-A-Tutorial`
    - **Region:** Same as before  
      ![VNet-A Basics](images/project-one/vnet-peering-tutorial/img%205.png)
4. Go to the **IP Addresses** tab.
5. Under **IPv4 address space**, enter `10.0.0.0/16`.  
   ![VNet-A IP Address](images/project-one/vnet-peering-tutorial/img%206.png)
6. Under **Subnets**, click **+ Add subnet**:
    - **Subnet name:** `Subnet-A1-Tutorial`
    - **Subnet address range:** `10.0.1.0/24`  
      ![Add Subnet-A1](images/project-one/vnet-peering-tutorial/img%207.png)
      Click **Add**.
7. (Optional) Add `NVA-Subnet-Tutorial` (`10.0.2.0/24`) for NVA.
8. Click **Review + create** and then **Create**.

### 2. Create VNet-B-Tutorial

1. Repeat the above steps for `VNet-B-Tutorial` with address space `10.1.0.0/16` and subnet `Subnet-B1-Tutorial` (`10.1.1.0/24`).
   ![VNet-B IP Address](images/project-one/vnet-peering-tutorial/img%2011.png)

---

## 💻 Deploying Test Virtual Machines (VMs)

### 1. Deploy VM-A-Tutorial in VNet-A-Tutorial

1. Go to **Virtual machines** and click **+ Create**.
2. On the **Basics** tab:
    - **VM Name:** `VM-A-Tutorial`
    - (Other fields: RG, Region, Image, Size, Auth, Ports as shown)  
      ![VM-A Basics](images/project-one/vnet-peering-tutorial/img%2015.png)
3. On the **Networking** tab:
    - **Virtual network:** `VNet-A-Tutorial`
    - **Subnet:** `Subnet-A1-Tutorial`  
      ![VM-A Networking](images/project-one/vnet-peering-tutorial/img%2017.png)
4. Click **Review + create** and then **Create**.

### 2. Deploy VM-B-Tutorial

- Repeat the above steps for `VM-B-Tutorial` in `VNet-B-Tutorial` and `Subnet-B1-Tutorial`.

### 3. (Important!) Allow ICMP (Ping) in NSGs

> **Tip:**  
> To test connectivity with `ping`, allow ICMP in the Network Security Group (NSG) for both VMs.

1. Go to each VM → **Networking** → **+ Add inbound port rule**.
2. Set **Protocol:** ICMP, **Name:** Allow_ICMP_Inbound.
   ![ICMP Rule](images/project-one/vnet-peering-tutorial/img%2020.png)

---

## 🔗 Configuring VNet Peering

### 1. Create Peering from VNet-A-Tutorial to VNet-B-Tutorial

1. Go to `VNet-A-Tutorial` → **Peerings** → **+ Add**.
2. Configure:
    - **This VNet Peering link name:** `VNet-A-to-VNet-B-Peering`
    - **Remote VNet Peering link name:** `VNet-B-to-VNet-A-Peering`
    - **Remote virtual network:** `VNet-B-Tutorial`
    - Ensure "Allow" options are checked  
      ![Peering Config](images/project-one/vnet-peering-tutorial/vnet%20peering.png)
3. Click **Add**.

### 2. Verify Peering Status

- Both VNets should show **Connected** status in their Peerings tab.
  ![Peering Status](images/project-one/vnet-peering-tutorial/peering%20statrus.png)

---

## 🧪 Testing Basic Connectivity

### 1. Get VM Private IP Addresses

- VM-A-Tutorial → **Networking** or **Overview** → Note **Private IP address**
- VM-B-Tutorial → **Overview** → Note **Private IP address**

### 2. Connect to VMs and Test Ping

1. SSH into VM-A-Tutorial  
   ![SSH to VM-A](images/project-one/vnet-peering-tutorial/vm%20a%20ssh.png)
2. From VM-A-Tutorial, ping VM-B-Tutorial's private IP:

```bash
ping <VM-B-Tutorial-Private-IP>
```

3. Repeat from VM-B-Tutorial to VM-A-Tutorial.

---

## 🧑‍💻 Advanced: Routing Traffic via a Network Virtual Appliance (NVA)

### 1. Deploy a Simple NVA (Linux VM)

- Deploy `NVA-Tutorial` in `VNet-A-Tutorial` and `NVA-Subnet-Tutorial`.
- Enable **IP forwarding** on the NVA's NIC.

### 2. Create a Route Table

- Go to **Route tables** → **+ Create**
- Name: `RT-Force-To-NVA-Tutorial`

### 3. Add a User Defined Route (UDR)

- In the route table, add a route:
    - **Route name:** `To-VNet-A-Via-NVA`
    - **Destination:** `10.0.0.0/16`
    - **Next hop type:** Virtual appliance
    - **Next hop address:** NVA-Tutorial's Private IP

### 4. Associate the Route Table

- Associate with `VNet-B-Tutorial` → `Subnet-B1-Tutorial`

### 5. Test Traffic Flow via NVA

- Use `traceroute` (Linux) or `tracert` (Windows) from VM-B-Tutorial to VM-A-Tutorial.
- You should see the NVA's IP as a hop.

---

## 🧹 Clean Up Resources

> **Warning:**  
> To avoid ongoing charges, delete the resources you created.

- [ ] In the Azure portal, go to **Resource groups**
- [ ] Select `VNet-Peering-Tutorial-RG`
- [ ] Click **Delete resource group** and confirm

```azurecli
# Example Azure CLI command to delete the resource group
az group delete --name VNet-Peering-Tutorial-RG --yes --no-wait
```

---

## 🎉 Conclusion

Congratulations!  
You've successfully configured **VNet Peering**, deployed VMs, and optionally routed traffic through an NVA in Azure.  
This project covers fundamental Azure networking skills.

---

> _Happy Networking!_  
> _For questions or feedback, connect with me on [LinkedIn](https://www.linkedin.com/in/andres-bravo-cardozo)._
      ![Add UDR](images/project-one/vnet-peering-tutorial/route%20creation%20in%20route%20table.png)
3. Click **Add**.

**6.4. Associate the Route Table with Subnet-B1-Tutorial**

1. In RT-Force-To-NVA-Tutorial -> **Subnets**. Click **+ Associate**.
2. Associate:
    - **Virtual network:** VNet-B-Tutorial.
    - **Subnet:** Check Subnet-B1-Tutorial.  
      ![Associate Route Table](images/project-one/vnet-peering-tutorial/associate%20route.png)
3. Click **OK**.

**6.5. Test Traffic Flow via NVA**

1. Connect to VM-B-Tutorial via SSH.
2. Use traceroute (Linux) or tracert (Windows) to trace the path to VM-A-Tutorial.
   ![Traceroute Example](images/project-one/vnet-peering-tutorial/img%2029.png)
   You should see the Private IP address of NVA-Tutorial (e.g., 10.0.2.4) as one of the hops after VM-B's gateway, before reaching VM-A.
   (Note: The actual IP addresses and timings will vary. The key is seeing the NVA's IP in the path.)
3. You can also try pinging VM-A-Tutorial from VM-B-Tutorial. It should still work, but now traffic is flowing via the NVA.

---

**Section 7: Clean Up Resources**

To avoid ongoing charges, delete the resources you created. The easiest way is to delete the resource group.

1. In the Azure portal, navigate to **Resource groups**.
2. Select the VNet-Peering-Tutorial-RG resource group.
3. On the "Overview" page for the resource group, click **Delete resource group**.
4. Type the resource group name (VNet-Peering-Tutorial-RG) to confirm deletion.
5. Click **Delete**.

```azurecli
# Example Azure CLI command to delete the resource group
az group delete --name VNet-Peering-Tutorial-RG --yes --no-wait
```

It might take a few minutes for all resources to be deleted.

---

**Conclusion**

Congratulations! You've successfully configured VNet Peering, deployed VMs, and optionally routed traffic through an NVA in Azure. This project covers fundamental Azure networking skills.

---
