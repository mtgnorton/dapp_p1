<template>

  <div>
    <h2>众筹项目列表</h2>

    <template v-for="project in projectInfoList">
      <div>

        <div style="border: 1px solid blue">
          <h3>项目名称:{{ project.title }}</h3>
          <p>项目地址:{{ project.address }}</p>
          <p>项目描述:{{ project.desc }}</p>
          <p>项目截止日期:{{ project.deadline }}</p>
          <p>项目目标金额:{{ project.goal_amount }}</p>
          <p>项目当前筹款金额:{{ project.current_amount }}</p>

        </div>

        <div style="border: 1px solid blue; margin-top: 20px">
          <input type="text" name="contribute-amount" v-model="contributeAmount">
          <button @click="$emit('contribute',project.contract,contributeAmount)"> 捐款</button>

        </div>
        <div style="border: 1px solid #2020a7; margin-top: 20px">
          <p>当众筹到期时,并且众筹没有完成时,可以退款</p>
          <button @click="$emit('refund',project.contract)">退款</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
export default {
  data() {
    return {
      contributeAmount: 100000000000000,
    }
  },
  props: [
    'projectInfoList'
  ]
}
</script>
