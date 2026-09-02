<script setup lang="ts">
import {onMounted} from "vue";

defineOptions({name: 'SystemUser'})

onMounted(() => {
  console.log('user')
})
</script>

<template>
  <div>用户</div>
</template>