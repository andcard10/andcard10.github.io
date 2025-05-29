---

**Tutorial: Step-by-Step Guide to VNet Peering & Routing in Azure**

**Introduction**

Welcome! This tutorial will guide you through setting up VNet Peering between two Azure Virtual Networks, deploying test Virtual Machines, and optionally configuring User Defined Routes (UDRs) to direct traffic through a Network Virtual Appliance (NVA). By the end, you'll have a practical understanding of these core Azure networking concepts.

**Prerequisites**

- An active Azure Subscription (a free trial is sufficient).
- Access to the Azure Portal.

**Architecture Overview**

We will build the following:

- **VNet-A-Tutorial:** 10.0.0.0/16
    - **Subnet-A1-Tutorial:** 10.0.1.0/24 (for VM-A)
    - **(Optional) NVA-Subnet-Tutorial:** 10.0.2.0/24 (for NVA)
- **VNet-B-Tutorial:** 10.1.0.0/16
    - **Subnet-B1-Tutorial:** 10.1.1.0/24 (for VM-B)
- **VM-A-Tutorial:** Test VM in Subnet-A1-Tutorial.
- **VM-B-Tutorial:** Test VM in Subnet-B1-Tutorial.
- **(Optional) NVA-Tutorial:** A simple Linux VM acting as an NVA.
- **VNet Peering:** Connecting VNet-A-Tutorial and VNet-B-Tutorial.
- **(Optional) Route Table & UDR:** To route traffic from Subnet-B1-Tutorial through NVA-Tutorial.

![Architecture Diagram](images/project-one/Project%20one%20diagram.drawio.png)

---

**Section 1: Preparing Your Azure Environment**

**1.1. Sign in to the Azure Portal**

1. Open your web browser and navigate to [https://portal.azure.com](https://portal.azure.com).
2. Sign in with your Azure account credentials.  
   ![Azure Portal Login](images/project-one/vnet-peering-tutorial/img%201.png)

**1.2. Create a Resource Group**
A resource group is a container that holds related resources for an Azure solution.

1. In the Azure portal search bar at the top, type "Resource groups" and select **Resource groups** from the services list.  
   ![Resource Groups](images/project-one/vnet-peering-tutorial/img%202.png)
2. On the "Resource groups" page, click **+ Create**.
3. On the "Basics" tab for creating a resource group:
    - **Subscription:** Select your Azure subscription.
    - **Resource group:** Enter a name, e.g., VNet-Peering-Tutorial-RG.
    - **Region:** Select a region (e.g., "Brazil South"). Make sure to use this same region for all resources.  
      ![Resource Group Basics](images/project-one/vnet-peering-tutorial/img%203.png)
4. Click **Review + create**.
5. After validation passes, click **Create**.

---

**Section 2: Creating Virtual Networks (VNets) and Subnets**

**2.1. Create VNet-A-Tutorial**

1. In the Azure portal search bar, type "Virtual networks" and select **Virtual networks**.  
   ![Virtual Networks](images/project-one/vnet-peering-tutorial/img%204.png)
2. On the "Virtual networks" page, click **+ Create**.
3. On the **Basics** tab:
    - **Resource group:** Select VNet-Peering-Tutorial-RG.
    - **Name:** Enter VNet-A-Tutorial.
    - **Region:** Same region (e.g., "Brazil South").  
      ![VNet-A Basics](images/project-one/vnet-peering-tutorial/img%205.png)
4. Click the **IP Addresses** tab.
5. Under **IPv4 address space**, remove any default and enter 10.0.0.0/16.  
   ![VNet-A IP Address](images/project-one/vnet-peering-tutorial/img%206.png)
6. Under **Subnets**, click **+ Add subnet**.
7. In the "Add subnet" pane for Subnet-A1-Tutorial:
    - **Subnet name:** Subnet-A1-Tutorial.
    - **Subnet address range:** 10.0.1.0/24.  
      ![Add Subnet-A1](images/project-one/vnet-peering-tutorial/img%207.png)
      Click **Add**.
8. (Optional for NVA) Click **+ Add subnet** again for NVA-Subnet-Tutorial:
    - **Subnet name:** NVA-Subnet-Tutorial.
    - **Subnet address range:** 10.0.2.0/24.  
      ![Add NVA Subnet](images/project-one/vnet-peering-tutorial/img%208.png)
      Click **Add**.
9. Your IP Addresses tab should now list the subnets.  
   ![Subnets List](images/project-one/vnet-peering-tutorial/img%209.png)
10. Click **Review + create**.  
    ![Review VNet-A](images/project-one/vnet-peering-tutorial/img%2010.png)
11. After validation passes, click **Create**.

**2.2. Create VNet-B-Tutorial**

1. Navigate back to "Virtual networks" and click **+ Create**.
2. **Basics** tab:
    - **Name:** VNet-B-Tutorial. (Ensure RG and Region are correct)
3. **IP Addresses** tab:
    - **IPv4 address space:** 10.1.0.0/16.  
      ![VNet-B IP Address](images/project-one/vnet-peering-tutorial/img%2011.png)
4. **Subnets**: Click **+ Add subnet** for Subnet-B1-Tutorial:
    - **Subnet name:** Subnet-B1-Tutorial.
    - **Subnet address range:** 10.1.1.0/24.  Click **Add**.  
5. Click **Review + create**.  
    ![Review VNet-B](images/project-one/vnet-peering-tutorial/img%2012.png)
    Then **Create**.

---

**Section 3: Deploying Test Virtual Machines (VMs)**

**3.1. Deploy VM-A-Tutorial in VNet-A-Tutorial**

1. Search for "Virtual machines" and select **Virtual machines**.  
   ![VMs List](images/project-one/vnet-peering-tutorial/img%2013.png)
2. Click **+ Create** and select **Azure virtual machine**.  
   ![Create VM](images/project-one/vnet-peering-tutorial/img%2014.png)
3. On the **Basics** tab:
    - **VM Name:** VM-A-Tutorial.
    - (Other fields: RG, Region, Image, Size, Auth, Ports as shown)  
      ![VM-A Basics](images/project-one/vnet-peering-tutorial/img%2015.png)
4. Click the **Networking** tab.
5. Configure networking:
    - **Virtual network:** VNet-A-Tutorial.
    - **Subnet:** Subnet-A1-Tutorial (10.0.1.0/24).  
      ![VM-A Networking](images/project-one/vnet-peering-tutorial/img%2017.png)
6. Click **Review + create**.  
   ![Review VM-A](images/project-one/vnet-peering-tutorial/img%2018.png)
7. After validation, click **Create**.

**3.2. Deploy VM-B-Tutorial**

1. Repeat VM creation steps.
2. **Basics** tab for VM-B-Tutorial.
3. **Networking** tab for VM-B-Tutorial:
    - **Virtual network:** VNet-B-Tutorial.
    - **Subnet:** Subnet-B1-Tutorial (10.1.1.0/24).
4. Click **Review + create**.  
   ![Review VM-B](images/project-one/vnet-peering-tutorial/vm%20b.png)
   Then **Create**.

**3.3. (Important!) Note on Network Security Groups (NSGs) for ICMP (Ping)**

1. Go to VM-A-Tutorial -> **Networking**. Click **+ Create port rule** (or "Add inbound port rule").  
   ![Add Port Rule](images/project-one/vnet-peering-tutorial/img%2019.png)
2. Configure rule for ICMP:
    - **Protocol:** ICMP, **Name:** Allow_ICMP_Inbound.  
      ![ICMP Rule](images/project-one/vnet-peering-tutorial/img%2020.png)
3. Click **Add**. Repeat for VM-B-Tutorial.

---

**Section 4: Configuring VNet Peering**

**4.1. Create Peering from VNet-A-Tutorial to VNet-B-Tutorial**

1. Navigate to VNet-A-Tutorial -> **Peerings**. Click **+ Add**.
2. Configure peering:
    - **This VNet Peering link name:** VNet-A-to-VNet-B-Peering.
    - **Remote VNet Peering link name:** VNet-B-to-VNet-A-Peering.
    - **Remote virtual network:** VNet-B-Tutorial.
    - Ensure "Allow" options are checked as shown.  
      ![Peering Config](images/project-one/vnet-peering-tutorial/vnet%20peering.png)
3. Click **Add**.

**4.2. Verify Peering Status**

1. In VNet-A-Tutorial -> **Peerings**, check status is **Connected**.  
   ![Peering Status A](images/project-one/vnet-peering-tutorial/peering%20statrus.png)
2. In VNet-B-Tutorial -> **Peerings**, check status is **Connected**.  
   ![Peering Status B](images/project-one/vnet-peering-tutorial/peering%20status%20b.png)

---

**Section 5: Testing Basic Connectivity**

**5.1. Get VM Private IP Addresses**

1. VM-A-Tutorial -> **Networking** (or Overview). Note its **Private IP address**.  
   ![VM-A Private IP](images/project-one/vnet-peering-tutorial/private%20ip%20from%20vm%20a.png)
2. VM-B-Tutorial -> **Overview**. Note its **Private IP address**.  
   ![VM-B Private IP](images/project-one/vnet-peering-tutorial/private%20ip%20from%20vm%20b.png)

**5.2. Connect to VMs and Test Ping**

1. Connect to VM-A-Tutorial (SSH/RDP).  
   ![SSH to VM-A](images/project-one/vnet-peering-tutorial/vm%20a%20ssh.png)
2. From VM-A-Tutorial, ping VM-B-Tutorial's private IP.  
   ![Ping from VM-A](images/project-one/vnet-peering-tutorial/test%20connection.png)
3. Connect to VM-B-Tutorial.
4. From VM-B-Tutorial, ping VM-A-Tutorial's private IP.  
   ![Ping from VM-B](images/project-one/vnet-peering-tutorial/ping%20from%20vm%20b.png)

---

**Section 6: (Optional Advanced) Routing Traffic via a Network Virtual Appliance (NVA)**

**6.1. Deploy a Simple NVA (Linux VM)**

1. Deploy NVA-Tutorial in VNet-A-Tutorial and NVA-Subnet-Tutorial.
    - **Basics Tab:** same settings
    - **Networking Tab:**
        - **VNet:** VNet-A-Tutorial, **Subnet:** NVA-Subnet-Tutorial.  
          ![NVA Config](images/project-one/vnet-peering-tutorial/nva%20config.png)
    - **Review + Create Tab:**  
      ![NVA Settings](images/project-one/vnet-peering-tutorial/nva%20settings.png)
- Click **Create**. You can see it being created in the VM list.  
  ![VMs List with NVA](images/project-one/vnet-peering-tutorial/vms.png)
1. Go to NVA-Tutorial -> **Networking**. Click its Network Interface name.  
   ![NVA NIC](images/project-one/vnet-peering-tutorial/nic%20nva.png)
2. Network Interface -> **IP configurations**. Click ipconfig1.
3. Set **IP forwarding** to **Enabled**. Click **Save**.  
   ![Enable IP Forwarding](images/project-one/vnet-peering-tutorial/ip%20forwarding.png)
4. Note NVA-Tutorial's Private IP (e.g., 10.0.2.4).

**6.2. Create a Route Table**

1. Search for "Route tables" and select **Route tables**.  
   ![Route Tables](images/project-one/vnet-peering-tutorial/route%20tables.png)
2. Click **+ Create**.
3. **Basics** tab:
    - **Name:** RT-Force-To-NVA-Tutorial.  
      ![Create Route Table](images/project-one/vnet-peering-tutorial/create%20route%20table.png)
4. Click **Review + create**.  
   ![Review Route Table](images/project-one/vnet-peering-tutorial/create%20route%20table%20review.png)
   Then **Create**.

**6.3. Add a User Defined Route (UDR)**

1. Navigate to RT-Force-To-NVA-Tutorial -> **Routes**. Click **+ Add**.
2. Configure route:
    - **Route name:** To-VNet-A-Via-NVA.
    - **Destination IP addresses/CIDR ranges:** 10.0.0.0/16.
    - **Next hop type:** Virtual appliance.
    - **Next hop address:** NVA-Tutorial's Private IP (e.g., 10.0.2.4).  
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

It might take a few minutes for all resources to be deleted.

---

**Conclusion**

Congratulations! You've successfully configured VNet Peering, deployed VMs, and optionally routed traffic through an NVA in Azure. This project covers fundamental Azure networking skills.

---
