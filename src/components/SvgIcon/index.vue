<script setup lang="ts">
import {computed} from 'vue'

const props = withDefaults(defineProps<{
  name: string
  className?: string
  width?: number
  height?: number
}>(), {
  className: '',
  width: 16,
  height: 16,
})

const symbolId = computed(() => `#icon-${props.name}`)
</script>

<template>
  <svg aria-hidden="true" :class="className" fill="currentColor" :width="width" :height="height">
    <use :href="symbolId"/>
  </svg>
</template>