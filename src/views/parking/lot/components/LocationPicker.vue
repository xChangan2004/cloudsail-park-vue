<script setup>
import {watch, onUnmounted, ref, nextTick} from "vue";
import AMapLoader from '@amap/amap-jsapi-loader'
import {ElMessage} from "element-plus";

defineOptions({name: 'LocationPicker'})

const visible = ref(false)
const containerRef = ref(null)
const keyword = ref('')
const searching = ref(false)
const mapReady = ref(false)

const map = ref(null)
const geocoder = ref(null) // 逆地理编码实例
const marker = ref(null) // 点位标记
const autoComplete = ref(null) // 输入提示
const placeSearch = ref(null) // POI搜索

let AMapClass = null

const props = defineProps({
  longitude: {type: Number, default: undefined},
  latitude: {type: Number, default: undefined},
  address: {type: String, default: ''},
})

const emit = defineEmits(['update:longitude', 'update:latitude', 'update:address', 'picked'])

/**
 * 统一落点：地图点击、搜索选中、回车搜索，全走这里
 */
const applyLocation = (lng, lat) => {
  if (!map.value) return

  const lng6 = Math.round(lng * 1e6) / 1e6
  const lat6 = Math.round(lat * 1e6) / 1e6
  const pos = [lng6, lat6]

  if (!marker.value) {
    marker.value = new AMapClass.Marker({
      map: map.value,
      anchor: 'bottom-center'
    })
  }
  marker.value?.setPosition(pos)
  map.value?.setZoomAndCenter(16, pos)

  emit('update:longitude', lng6)
  emit('update:latitude', lat6)

  // 逆地理编码是异步的，放在经纬度之后，失败了也不影响经纬度写入
  geocoder.value.getAddress(pos, (status, result) => {
    if (status === 'complete' && result.regeocode) {
      emit('update:address', result.regeocode.formattedAddress || '')
    }

    emit('picked')
  })
}

// 输入提示
const fetchTips = (query, callback) => {
  if (!query || !autoComplete.value) return callback([])
  autoComplete.value.search(query, (status, result) => {
    callback(status === 'complete' && result.tips ? result.tips.filter(t => t.name) : [])
  })
}

// 选中联想项
const handleSelectTip = (tip) => {
  keyword.value = tip.name
  if (tip.location) {
    applyLocation(tip.location.lng, tip.location.lat)
  } else {
    // 行政区等条目没有坐标，退回关键字搜索
    searchByKeyword(tip.name)
  }
}

// 关键字搜索（回车 / 点按钮搜索）
const searchByKeyword = (kw) => {
  if (!kw || !placeSearch.value) return
  searching.value = true
  placeSearch.value?.search(kw, (status, result) => {
    searching.value = false
    const poi = result?.poiList?.pois?.[0]
    if (status !== 'complete' || !poi) {
      ElMessage.warning('没搜到这个地点，换个关键词试试')
      return
    }
    applyLocation(poi.location.lng, poi.location.lat)
  })
}

const handleSearch = () => searchByKeyword(keyword.value?.trim())

// 初始化地图方法
const initMap = () => {
  // 防止重复初始化
  if (map.value) return
  window._AMapSecurityConfig = {
    securityJsCode: '98d96b912baaf02d194a0c6d901bf7fe'
  }
  AMapLoader.load({
    key: '360bd9439a7beb1da57e71ec77e1c09a',  // 申请好的Web端开发者Key，首次调用 load 时必填
    version: '2.0', // 指定要加载的 JSAPI 的版本，缺省时默认为 1.4.15
    plugins: [
      'AMap.Scale',
      'AMap.Geocoder',
      'AMap.AutoComplete',
      'AMap.PlaceSearch',
    ], //需要使用的的插件列表，如比例尺'AMap.Scale'，支持添加多个如：['...','...']
  }).then((AMap) => {
    AMapClass = AMap

    // 初始化中心点，优先使用父组件传入的经纬度，默认北京
    const hasCoord = props.longitude != null && props.latitude != null
    const initCenter = hasCoord ? [props.longitude, props.latitude] : [116.397428, 39.90923]

    map.value = new AMap.Map(containerRef.value, {
      // 设置地图容器id
      viewMode: '3D', // 是否为3D地图模式
      zoom: 11, // 初始化地图级别
      center: initCenter, // 初始化地图中心点位置
    })

    // 只有已有坐标才落标记，否则不插
    if (hasCoord) {
      marker.value = new AMap.Marker({
        position: initCenter,
        anchor: 'bottom-center',
      })
      map.value?.add(marker.value)
    }

    // 实例化逆地理编码
    geocoder.value = new AMap.Geocoder()

    // 搜索插件只当数据源
    autoComplete.value = new AMap.AutoComplete({city: '全国'})
    placeSearch.value = new AMap.PlaceSearch({city: '全国'})

    // 添加比例尺
    const scale = new AMap.Scale({
      position: "LB", //左下角
    });
    map.value?.addControl(scale)

    // 单击选点
    map.value?.on('click', e => applyLocation(e.lnglat.getLng(), e.lnglat.getLat()))

    mapReady.value = true
  }).catch(() => {
    ElMessage.error('地图加载失败，请检查网络或稍后重试')
  })
}

// 监听弹窗显示状态
watch(visible, async (open) => {
  if (!open) return
  // 弹窗打开，等待DOM渲染完成
  await nextTick()
  initMap()
})

onUnmounted(() => {
  map.value?.destroy();
  map.value = null
});
</script>

<template>
  <el-popover
    v-model="visible"
    width="600"
    trigger="click"
  >
    <template #reference>
      <el-button type="primary" @click="visible = true">选择地理位置</el-button>
    </template>
    <!-- 搜索区域 -->
    <div class="lp-search">
      <el-autocomplete
        v-model="keyword"
        value-key="name"
        :fetch-suggestions="fetchTips"
        :disabled="!mapReady"
        :teleported="false"
        placeholder="搜索地点，如：深圳北站（回车直接搜）"
        clearable
        @select="handleSelectTip"
        @keyup.enter="handleSearch"
      />
      <el-button type="primary" :disabled="!mapReady" :loading="searching" @click="handleSearch">
        搜索
      </el-button>
    </div>
    <!-- 地图 -->
    <div ref="containerRef" class="lp-map"></div>
  </el-popover>
</template>

<style scoped>
.lp-search {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.lp-map {
  width: 100%;
  height: 400px;
}
</style>