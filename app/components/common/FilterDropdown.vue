<template>
  <div ref="dropdownRoot" class="filter-dropdown" @focusout="handleFocusOut">
    <button
      :id="triggerId"
      ref="triggerButton"
      type="button"
      class="filter-dropdown-trigger"
      :class="{ active: modelValue !== null, open: isOpen }"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      :aria-controls="isOpen ? menuId : undefined"
      @click="toggleDropdown"
      @keydown.down.prevent="openDropdown('selected')"
      @keydown.up.prevent="openDropdown('last')"
    >
      <span>{{ selectedLabel }}</span>
      <ChevronDown class="filter-dropdown-chevron" :class="{ open: isOpen }" aria-hidden="true" />
    </button>

    <div
      v-if="isOpen"
      :id="menuId"
      class="filter-dropdown-menu"
      role="listbox"
      :aria-labelledby="triggerId"
      @keydown.down.prevent="focusRelativeOption(1)"
      @keydown.up.prevent="focusRelativeOption(-1)"
      @keydown.home.prevent="focusOption(0)"
      @keydown.end.prevent="focusOption(optionCount - 1)"
      @keydown.esc.stop.prevent="closeDropdown(true)"
    >
      <button
        type="button"
        class="filter-dropdown-option"
        :class="{ selected: modelValue === null }"
        role="option"
        :aria-selected="modelValue === null"
        @click="selectOption(null)"
      >
        {{ allLabel }}
        <Check v-if="modelValue === null" class="filter-dropdown-check" aria-hidden="true" />
      </button>
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="filter-dropdown-option"
        :class="{ selected: modelValue === option.value }"
        role="option"
        :aria-selected="modelValue === option.value"
        @click="selectOption(option.value)"
      >
        {{ option.label }}
        <Check
          v-if="modelValue === option.value"
          class="filter-dropdown-check"
          aria-hidden="true"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Check, ChevronDown } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'

interface FilterDropdownOption {
  label: string
  value: string
}

defineOptions({ name: 'FilterDropdown' })

const props = withDefaults(
  defineProps<{
    modelValue: string | null
    options: readonly FilterDropdownOption[]
    allLabel?: string
  }>(),
  {
    allLabel: 'All',
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const dropdownRoot = ref<HTMLDivElement | null>(null)
const triggerButton = ref<HTMLButtonElement | null>(null)
const isOpen = ref(false)
const componentId = useId()
const triggerId = `filter-dropdown-trigger-${componentId}`
const menuId = `filter-dropdown-menu-${componentId}`

const selectedLabel = computed(
  () => props.options.find((option) => option.value === props.modelValue)?.label ?? props.allLabel
)
const optionCount = computed(() => props.options.length + 1)

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsidePointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsidePointerDown)
})

function getOptionElements(): HTMLButtonElement[] {
  return Array.from(
    dropdownRoot.value?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []
  )
}

function toggleDropdown() {
  if (isOpen.value) {
    closeDropdown()
    return
  }
  isOpen.value = true
}

async function openDropdown(focusTarget: 'selected' | 'last') {
  isOpen.value = true
  await nextTick()

  if (focusTarget === 'last') {
    focusOption(optionCount.value - 1)
    return
  }

  const selectedIndex =
    props.modelValue === null
      ? 0
      : Math.max(props.options.findIndex((option) => option.value === props.modelValue) + 1, 0)
  focusOption(selectedIndex)
}

function closeDropdown(restoreFocus = false) {
  isOpen.value = false
  if (restoreFocus) {
    triggerButton.value?.focus()
  }
}

function selectOption(value: string | null) {
  emit('update:modelValue', value)
  closeDropdown(true)
}

function focusOption(index: number) {
  const options = getOptionElements()
  options[index]?.focus()
}

function focusRelativeOption(offset: number) {
  const options = getOptionElements()
  if (options.length === 0) return

  const currentIndex = options.indexOf(document.activeElement as HTMLButtonElement)
  const nextIndex = (currentIndex + offset + options.length) % options.length
  options[nextIndex]?.focus()
}

function handleOutsidePointerDown(event: PointerEvent) {
  if (!(event.target instanceof Node) || dropdownRoot.value?.contains(event.target)) return
  closeDropdown()
}

function handleFocusOut(event: FocusEvent) {
  if (event.relatedTarget instanceof Node && dropdownRoot.value?.contains(event.relatedTarget))
    return
  closeDropdown()
}
</script>

<style scoped>
.filter-dropdown {
  position: relative;
}

.filter-dropdown-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 12px 6px 16px;
  border: 0;
  border-radius: 20px;
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-dropdown-trigger:hover,
.filter-dropdown-trigger.active,
.filter-dropdown-trigger.open {
  background: var(--primary-color);
  color: white;
}

.filter-dropdown-trigger:focus-visible,
.filter-dropdown-option:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

.filter-dropdown-chevron {
  width: 14px;
  height: 14px;
  transition: transform 0.2s ease;
}

.filter-dropdown-chevron.open {
  transform: rotate(180deg);
}

.filter-dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 20;
  display: flex;
  min-width: 100%;
  max-height: 240px;
  flex-direction: column;
  gap: 2px;
  padding: 6px;
  overflow-y: auto;
  border: 1px solid var(--secondary-border-color);
  border-radius: 12px;
  background: var(--bg-card);
  box-shadow: var(--shadow-md);
}

.filter-dropdown-option {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.75rem;
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}

.filter-dropdown-option:hover,
.filter-dropdown-option:focus-visible {
  background: var(--bg-card-hover);
}

.filter-dropdown-option.selected {
  color: var(--primary-color);
}

.filter-dropdown-check {
  width: 14px;
  height: 14px;
  flex: none;
}
</style>
