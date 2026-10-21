<script setup lang="ts">
import {computed, nextTick, reactive, ref, watch} from "vue";
import {ElMessage, type FormInstance, type FormItemRule, type FormRules, type UploadRequestOptions} from "element-plus";
import {addParkingLotApi, editParkingLotApi, getParkingLotApi, type ParkingLotFormDTO} from "@/api/lot";
import LocationPicker from "./components/LocationPicker.vue"
import {uploadFileApi} from "@/api/upload.ts";
import {ArrowLeft, ArrowRight, Delete, Plus} from "@element-plus/icons-vue";

defineOptions({name: 'LotFormDialog'})

const props = defineProps<{
  // 控制弹窗
  modelValue: boolean
  // 有值=编辑（查详情回填），无值=新增
  id?: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const isEdit = computed(() => !!props.id)

const defaultForm = (): ParkingLotFormDTO => ({
  id: null,
  name: '',
  address: '',
  totalSpaces: undefined,
  longitude: undefined,
  latitude: undefined,
  contact: '',
  status: 0,
  cover: '',
  images: []
})

const formRef = ref<FormInstance>()
const form = reactive<ParkingLotFormDTO>(defaultForm())

/** 数值校验器：可选字段填了才校验；integer=true 时额外要求整数 */
const rangeValidator = (label: string, min: number, max: number, integer = false): FormItemRule['validator'] =>
  (_rule, value, callback) => {
    if (value === undefined || value === null || value === '') return callback()
    const num = Number(value)
    if (Number.isNaN(num)) return callback(new Error(`${label}必须是数字`))
    if (integer && !Number.isInteger(num)) return callback(new Error(`${label}必须是整数`))
    if (num < min || num > max) return callback(new Error(`${label}范围为 ${min} ~ ${max}`))
    callback()
  }

const rules: FormRules = {
  name: {required: true, message: '请输入名称', trigger: 'blur'},
  address: {required: true, message: '请选择位置', trigger: 'blur'},
  status: {required: true, message: '请选择状态', trigger: 'blur'},
  longitude: [{required: true, message: '请选择位置', trigger: 'blur'},
    {validator: rangeValidator('经度', -180, 180), trigger: 'blur'}],
  latitude: [{required: true, message: '请选择位置', trigger: 'blur'},
    {validator: rangeValidator('纬度', -90, 90), trigger: 'blur'}],
  totalSpaces: [
    {required: true, message: '请输入总车位数', trigger: 'blur'},
    {validator: rangeValidator('总车位数', 1, 99999, true), trigger: 'blur'}
  ],
}

const detailLoading = ref(false)
watch(() => props.modelValue, async (open) => {
  if (!open) return
  // 填充干净的默认值
  Object.assign(form, defaultForm())

  if (props.id) {
    detailLoading.value = true
    try {
      const detail = await getParkingLotApi(props.id) as ParkingLotFormDTO
      Object.assign(form, detail)
    } finally {
      detailLoading.value = false
    }
  }

  await nextTick()
  formRef?.value?.clearValidate()
})

const handlePicked = () => {
  formRef?.value?.validateField(['address', 'longitude', 'latitude']).catch(() => {
  })
}

const submitting = ref(false)
const handleSubmit = async () => {
  await formRef.value?.validate()
  submitting.value = true
  try {
    if (isEdit.value) {
      await editParkingLotApi(form)
    } else {
      await addParkingLotApi(form)
    }
    ElMessage.success(isEdit.value ? '编辑停车场成功' : '新增停车场成功')
    visible.value = false
    emit('success')
  } finally {
    submitting.value = false
  }
}

const coverUploading = ref(false)

/** 封面上传 */
const handleCoverUpload = async (options: UploadRequestOptions) => {
  const file = options.file
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.warning("图片不能超过 10MB")
    return
  }
  coverUploading.value = true
  try {
    const res = await uploadFileApi(file)
    form.cover = res.url
  } catch {
    // 不做操作
  } finally {
    coverUploading.value = false
  }
}

/** 移除封面 */
const clearCover = () => {
  form.cover = ''
}

const imagesUploading = ref(false)

const handleImageUpload = async (options: UploadRequestOptions) => {
  if ((form.images?.length ?? 0) >= 9) {
    ElMessage.warning('轮播图最多 9 张')
    return
  }

  const file = options.file
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.warning('图片不能超过 10MB')
    return
  }
  imagesUploading.value = true
  try {
    const res = await uploadFileApi(options.file)
    form.images = [...(form.images ?? []), res.url]
  } catch {
    // 失败提示由请求拦截器统一弹出
  } finally {
    imagesUploading.value = false
  }
}

const removeImage = (index: number) => {
  const next = [...(form.images ?? [])]
  next.splice(index, 1)
  // 删空了也要传 []，传 null 后端会当成「不修改」，图删不掉
  form.images = next
}

const moveImage = (index: number, offset: number) => {
  const list = form.images ?? []
  const target = index + offset
  if (target < 0 || target >= list.length) return
  const next = [...list]
  // 取出当前项
  const item = next.splice(index, 1)[0]
  if (item === undefined) return
  // 插入到目标位置
  next.splice(target, 0, item)
  form.images = next
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑停车场' : '新增停车场'"
    width="550px"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      label-width="80px"
      :model="form"
      :rules="rules"
    >
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入名称"/>
      </el-form-item>
      <el-form-item label="地址" prop="address">
        <el-input v-model="form.address" readonly placeholder="在地图中选点后自动填充"/>
      </el-form-item>
      <el-row :gutter="18">
        <el-col :span="9">
          <el-form-item label="经度" prop="longitude">
            <el-input v-model.number="form.longitude" readonly placeholder="选点后填充"/>
          </el-form-item>
        </el-col>
        <el-col :span="9">
          <el-form-item label="纬度" prop="latitude">
            <el-input v-model.number="form.latitude" readonly placeholder="选点后填充"/>
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <LocationPicker v-model:longitude="form.longitude" v-model:latitude="form.latitude"
                          v-model:address="form.address"
                          @picked="handlePicked"
          />
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="12">
          <el-form-item label="联系方式" prop="contact">
            <el-input v-model="form.contact" placeholder="请输入联系方式"/>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="总车位" prop="totalSpaces">
            <el-input v-model.number="form.totalSpaces" placeholder="请输入总车位数"/>
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="封面" prop="cover">
        <div class="cover-field">
          <div v-if="form.cover" class="cover-item">
            <el-image
              :src="form.cover"
              fit="cover"
              class="cover-img"
              :preview-src-list="[form.cover]"
              preview-teleported
            />
            <div class="cover-mask">
              <el-icon class="cover-btn cover-danger" @click.stop="clearCover">
                <Delete/>
              </el-icon>
            </div>
          </div>
          <el-upload
            v-else
            class="cover-uploader"
            action="#"
            :show-file-list="false"
            :http-request="handleCoverUpload"
            :disabled="coverUploading"
            accept="image/jpeg,image/png,image/webp,image/gif"
          >
            <div class="cover-box" v-loading="coverUploading">
              <el-icon v-if="!coverUploading" class="cover-uploader-icon">
                <Plus/>
              </el-icon>
            </div>
          </el-upload>
        </div>
      </el-form-item>
      <el-form-item label="轮播图" prop="images">
        <div class="images-field">
          <div class="images-grid">
            <div v-for="(url, index) in form.images" :key="url" class="img-item">
              <el-image
                :src="url"
                fit="cover"
                class="img-thumb"
                :preview-src-list="form.images"
                :initial-index="index"
                preview-teleported
              />
              <div class="img-mask">
                <el-icon v-if="index > 0" class="img-btn" @click.stop="moveImage(index, -1)">
                  <ArrowLeft/>
                </el-icon>
                <el-icon class="img-btn img-danger" @click.stop="removeImage(index)">
                  <Delete/>
                </el-icon>
                <el-icon v-if="index < (form.images?.length ?? 0) - 1" class="img-btn"
                         @click.stop="moveImage(index, 1)">
                  <ArrowRight/>
                </el-icon>
              </div>
              <span class="img-index">{{ index + 1 }}</span>
            </div>

            <el-upload
              v-if="(form.images?.length ?? 0) < 9"
              class="images-uploader"
              action="#"
              :show-file-list="false"
              :http-request="handleImageUpload"
              :disabled="imagesUploading"
              accept="image/jpeg,image/png,image/webp,image/gif"
            >
              <div class="img-trigger" v-loading="imagesUploading">
                <el-icon v-if="!imagesUploading">
                  <Plus/>
                </el-icon>
              </div>
            </el-upload>
          </div>
          <div class="images-tip">最多 9 张，序号即用户端详情页的轮播顺序，鼠标移上去可左右调序</div>
        </div>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="form.status" placeholder="请选择状态">
          <el-option label="启用" :value="1"/>
          <el-option label="停用" :value="0"/>
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" :disabled="detailLoading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.cover-field {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cover-item {
  position: relative;
  width: 148px;
  height: 100px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  overflow: hidden;
  background: var(--el-fill-color-lighter);
}

.cover-img {
  width: 100%;
  height: 100%;
  display: block;
}

.cover-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 45%);
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.cover-item:hover .cover-mask {
  opacity: 1;
}

.cover-btn {
  font-size: 18px;
  color: #fff;
  cursor: pointer;
  pointer-events: auto;

  &:hover {
    color: var(--el-color-primary);
  }
}

.cover-danger:hover {
  color: var(--el-color-danger);
}

.cover-uploader :deep(.el-upload) {
  width: 148px;
  height: 100px;
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: var(--el-fill-color-lighter);
  color: var(--el-text-color-placeholder);
  transition: border-color 0.2s, color 0.2s;
  overflow: hidden;

  &:hover {
    border-color: var(--el-color-primary);
    color: var(--el-color-primary);
  }

  &.is-disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.cover-box {
  width: 148px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-uploader-icon {
  font-size: 24px;
}

.images-field {
  width: 100%;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(3, 88px);
  gap: 8px;
}

.img-item {
  position: relative;
  width: 88px;
  height: 88px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  overflow: hidden;
  background: var(--el-fill-color-lighter);
}

.img-thumb {
  width: 100%;
  height: 100%;
  display: block;
}

.img-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgb(0 0 0 / 45%);
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.img-item:hover .img-mask {
  opacity: 1;
}

.img-btn {
  font-size: 16px;
  color: #fff;
  cursor: pointer;
  pointer-events: auto;

  &:hover {
    color: var(--el-color-primary);
  }
}

.img-danger:hover {
  color: var(--el-color-danger);
}

.img-index {
  position: absolute;
  left: 4px;
  top: 4px;
  padding: 0 5px;
  font-size: 11px;
  line-height: 16px;
  color: #fff;
  background: rgb(0 0 0 / 55%);
  border-radius: 3px;
  pointer-events: none;
}

.images-uploader :deep(.el-upload) {
  width: 88px;
  height: 88px;
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-fill-color-lighter);
  color: var(--el-text-color-placeholder);
  transition: border-color 0.2s, color 0.2s;

  &:hover {
    border-color: var(--el-color-primary);
    color: var(--el-color-primary);
  }

  &.is-disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.img-trigger {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.images-tip {
  margin-top: 6px;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
}
</style>