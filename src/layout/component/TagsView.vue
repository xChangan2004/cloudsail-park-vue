<script setup lang="ts">
import {useRouter} from 'vue-router'
import {Close} from '@element-plus/icons-vue'
import {useTagsViewStore, type TagView} from '@/stores'

const router = useRouter()
const tagsStore = useTagsViewStore()

const handleClick = (tag: TagView) => {
  router.push(tag.path)
}

const handleClose = (tag: TagView) => {
  const nextPath = tagsStore.removeTag(tag.path)
  if (nextPath) router.push(nextPath)
}
</script>

<template>
  <div class="tags-view">
    <div class="tags-scroll">
      <div
        class="tag-item"
        v-for="tag in tagsStore.visitedTags"
        :key="tag.path"
        :class="{ active: tagsStore.activeTag === tag.path }"
        @click="handleClick(tag)"
      >
        <span class="tag-dot"/>
        <span class="tag-title">{{ tag.title }}</span>
        <el-icon
          v-if="tagsStore.closeable"
          class="tag-close"
          @click.stop="handleClose(tag)"
        >
          <Close/>
        </el-icon>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.tags-view {
  height: 34px;
  padding: 0 16px;
  background: #FAFBFC;
}

.tags-scroll {
  display: flex;
  align-items: center;
  height: 100%;
  overflow-x: auto; // 标签多了横向滚

  // 隐藏滚动条但保留滚动能力
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}

.tag-item {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  margin-right: 6px;
  border: 1px solid #00000014;
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  color: #7987A1;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.2s;

  &:hover {
    color: #5D87FF;

    .tag-dot {
      background: #5D87FF;
    }
  }

  .tag-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #e8e8e8;
    transition: background 0.2s;
  }

  &.active {
    color: #5D87FF;

    .tag-dot {
      background: #5D87FF;
    }
  }

  .tag-close {
    width: 16px;
    height: 16px;
    font-size: 12px;
    display: inline-flex;
    border-radius: 50%;
    margin: 0 -2px; // 抵消盒子多出来的 4px，标签整体宽度不变
    transition: all 0.2s;
    color: #7987A1;

    :deep(svg) {
      display: block; // 脱离行内基线流，盒子 flex 居中才生效
      transform: translateY(0.6px);
    }

    &:hover {
      background: #F2F4F5;
    }
  }
}
</style>