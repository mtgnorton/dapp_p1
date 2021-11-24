<template>

  <div>
    <prompt :prompt-message="promptMessage"></prompt>
  </div>

  <div><h1>合约地址为:{{ contractAddress }}</h1></div>

  <div>
    <project-list :project-info-list="projectInfoList" @contribute="contribute" @refund="refund"/>
  </div>

  <div>
    <!--    <connect-wallet @connect="connectWallet"/>-->
  </div>

  <div>
    当前钱包账户为:{{ selectedAddress }} <br>
    当前eth余额为:{{ ethBalance }} <br>

    余额不足时可以切换账户

  </div>


  <div v-if="isCreator">
    <Creator :creator-address="creatorAddress"/>
  </div>
</template>

<script>
import {ethers, BigNumber} from "ethers";

import CrowFundingArtifact from "../contracts/CrowdFunding.json";
import CrowFundingAddress from "../contracts/CrowdFundingAddress.json";

import ProjectArtifact from "../contracts/Project.json";

import ConnectWallet from "./ConnectWallet.vue";
import Prompt from "./Prompt.vue";
import ProjectList from "./ProjectList.vue";
import Creator from "./Creator.vue";


// 网络
const HARDHAT_NETWORK_ID = "1337";

//用户取消交易错误
const ERROR_CODE_TX_REJECTED_BY_USER = 4001; //用户拒绝

const ERROR_CODE_DAPP_INTERNAL_ERROR = -32603;//智能合约内部错误

function initialData() {
  return {
    // provider: undefined, //动态绑定会报错
    // contact: undefined, //动态绑定会报错
    // projectInfoList: {},
    selectedAddress: undefined,
    ethBalance: undefined,
    txBeingSent: undefined,
    promptMessage: undefined,
    creatorAddress: undefined,
    contractAddress: undefined,
  };
}


export default {
  name: "App",

  components: {
    ConnectWallet,
    Prompt,
    ProjectList,
    Creator
  },

  // We store multiple things in Dapp's state.
  // You don't need to follow this pattern, but it's an useful example.
  data() {
    return initialData()
  },

  async mounted() {

    this.contractAddress = CrowFundingAddress.Token

    if (await this.getSelectedAddress() && await this.initializeProviderAndContract()
    ) {
      await this.startPollingData()
    }

    this.getCreatorAddress()
    this.listenAccountChange()
    this.listenFundAmountChange()
  },

  computed: {
    isCreator() {
      if (this.selectedAddress === undefined || this.creatorAddress === undefined) {
        return false
      }

      return this.selectedAddress.toLowerCase() === this.creatorAddress.toLowerCase()
    }
  },

  methods: {


    async getSelectedAddress() {
      const [selectedAddress] = await window.ethereum.enable();

      this.selectedAddress = selectedAddress


      if (!this.checkNetwork()) {
        return false;
      }
      return true;
    },

    // 初始化网络提供者和智能合约
    async initializeProviderAndContract() {


      this.provider = new ethers.providers.Web3Provider(window.ethereum)

      this.contract = new ethers.Contract(
          CrowFundingAddress.Token,
          CrowFundingArtifact.abi,
          this.provider.getSigner(0)
      )


      return true

    },


    // 轮询智能合约相关数据
    async startPollingData() {

      await this.getProjectData()
      this.getEthBalance()
      this.pollDataInterval = setInterval(() => {
        this.getProjectData();
        this.getEthBalance()
      }, 5000);

    },

    // 清除轮询
    stopPollingData() {
      clearInterval(this.pollDataInterval);
      this.pollDataInterval = undefined;
    },

    // 监听钱包切换事件
    listenAccountChange() {
      window.ethereum.on("accountsChanged", async ([newAddress]) => {
        console.log('meta 账户改变,新地址为', newAddress);

        this.stopPollingData();

        if (newAddress === undefined) {
          return this.resetState();
        }

        this.selectedAddress = newAddress

        if (await this.initializeProviderAndContract()) {
          this.startPollingData()
        }

      });
    },


    //通过只能合约的事件机制监听所有众筹项目的筹款情况
    listenFundAmountChange() {

      console.log(this.projectInfoList);

      for (let i in this.projectInfoList) {

        let contract = this.projectInfoList[i].contract
        console.log("开始监听项目地址为" + contract.address + "的筹款情况")
        contract.on("FundingReceived", (contributor, amount, currentTotal, event) => {

          console.log("捐款者为:", contributor);
          console.log("捐款数量为:", amount);
          console.log("当前捐款总额为:", currentTotal);

        });
      }
    },
    async getCreatorAddress() {
      if (!this.contract) {
        return
      }

      this.creatorAddress = await this.contract.Creator()
      console.log('合约创建者的地址为:', this.creatorAddress);


    },
    // 获取钱包中eth的余额
    async getEthBalance() {
      if (!this.provider) {
        return
      }
      this.ethBalance = await this.provider.getBalance(this.selectedAddress)
      // console.log(this.selectedAddress, this.ethBalance);

    },
    // 获取合约中所有的众筹项目
    async getProjectData() {


      if (!this.contract) {
        return
      }

      let projects = await this.contract.returnAllProjects();

      let temp = {}

      for (let i = 0; i < projects.length; i++) {
        let projectContract = new ethers.Contract(
            projects[i],
            ProjectArtifact.abi,
            this.provider.getSigner(0)
        )
        let projectInfo = await projectContract.getDetails()

        temp[projects[i]] = {
          'title': projectInfo['projectTitle'],
          'desc': projectInfo['projectDesc'],
          'creator': projectInfo['projectStarter'],
          'goal_amount': parseInt(projectInfo['goalAmount']),
          'deadline': this.timestampToTime(parseInt(projectInfo['deadline'])),
          'current_amount': parseInt(projectInfo['currentAmount']),
          'address': projects[i],
          'contract': projectContract
        }
      }


      this.projectInfoList = temp

    },

    // 捐款
    async contribute(contract, amount) {

      if (amount <= 0) {
        this.promptMessage = "捐款金额错误";
      }
      const donation = {value: amount}

      try {
        console.log("捐款数量为:", amount);
        const tx = await contract.contribute(donation)

        this.txBeingSent = tx.hash

        const receipt = await tx.wait()

        if (receipt.status === 0) {
          throw new Error("交易失败")
        }

        await this.getProjectData()

      } catch (error) {
        console.log(error);
        if (error.code === ERROR_CODE_DAPP_INTERNAL_ERROR) {
          alert(error.data.message)
        }
        if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) { //用户拒绝
          alert('用户已取消')
        }

      } finally {
        this.txBeingSent = undefined
      }

    },

    async refund(contract) {
      try {
        console.log('开始进行退款操作');
        const tx = await contract.getRefund()
        this.txBeingSent = tx.hash

        const receipt = await tx.wait()
        if (receipt.status === 0) {
          throw new Error("交易失败")
        }

        await this.getProjectData()

      } catch (error) {
        console.log(error);
        if (error.code === ERROR_CODE_DAPP_INTERNAL_ERROR) {
          alert(error.data.message)
        }
        if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) { //用户拒绝
          alert('用户已取消')
        }

      } finally {
        this.txBeingSent = undefined
      }
    },

    //检查metamask中配置的网络是否和启动的网络一致
    checkNetwork() {
      console.log('当前的网络id为:', window.ethereum.networkVersion);

      if (window.ethereum.networkVersion === HARDHAT_NETWORK_ID) {
        return true;
      }

      this.promptMessage = "Please connect Metamask to Localhost:8545";

      return false;
    },


    resetState() {
      Object.assign(this.$data, initialData());
    },

    timestampToTime(timestamp) {
      var date = new Date(timestamp * 1000);//时间戳为10位需*1000，时间戳为13位的话不需乘1000
      var Y = date.getFullYear() + '-';
      var M = (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '-';
      var D = date.getDate() + ' ';
      var h = date.getHours() + ':';
      var m = date.getMinutes() + ':';
      var s = date.getSeconds();
      return Y + M + D + h + m + s;
    }

  }


}
</script>
