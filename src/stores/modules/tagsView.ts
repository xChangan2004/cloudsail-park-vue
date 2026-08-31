import {defineStore} from 'pinia'

export interface TagView {
  path: string,
  title: string,
  name?: string
}

export const useTagsViewStore = defineStore('tagsView', {
  state: () => ({
    visitedTags: [] as TagView[],
    activeTag: '', // 当前高亮的标签 path
  }),
  actions: {
    // 添加标签
    addTag(tag: TagView) {
      // 已存在（按 path 判断）只激活，不重复加
      if (this.visitedTags.some(t => t.path === tag.path)) {
        this.activeTag = tag.path
        return
      }
      this.visitedTags.push(tag)
      this.activeTag = tag.path
    },
    // 关闭标签：返回该跳去的页面 path
    removeTag(path: string): string {
      const index = this.visitedTags.findIndex(t => t.path === path)
      if (index === -1) return ''

      this.visitedTags.splice(index, 1)

      // 关闭的是当前页 -> 跳转相邻页（优先右边，没了取左边）
      if (path === this.activeTag) {
        const next = this.visitedTags[index] ?? this.visitedTags[index - 1]
        this.activeTag = next?.path ?? ''
        return next?.path ?? ''
      }
      return ''
    }
  },
  getters: {
    closeable(): boolean {
      // 只剩一个标签时不显示关闭按钮
      return this.visitedTags.length > 1
    }
  }
})