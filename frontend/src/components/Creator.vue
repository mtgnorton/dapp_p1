<template>
  <div style="border: 1px solid blue; margin-top: 20px">
    <div >
      创建者地址:{{ creatorAddress }}
    </div>

    <div>
      创建者其他操作
    </div>
  </div>

</template>


<script>
export default {
  props: [
    'creatorAddress'
  ]
}
</script>
