<script setup lang="ts">
import type { ListboxRootEmits, ListboxRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { ListboxRoot, useFilter, useForwardPropsEmits } from 'reka-ui'
import { nextTick, onMounted, reactive, ref, watch } from 'vue'
import { cn } from '@/lib/utils'
import { provideCommandContext } from '.'

const props = withDefaults(defineProps<ListboxRootProps & { class?: HTMLAttributes['class'], shouldFilter?: boolean }>(), {
  modelValue: '',
  highlightOnHover: true,
  shouldFilter: true,
})

const emits = defineEmits<ListboxRootEmits>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardPropsEmits(delegatedProps, emits)

const listboxRef = ref<any>(null)

const allItems = ref<Map<string, string>>(new Map())
const allGroups = ref<Map<string, Set<string>>>(new Map())

const { contains } = useFilter({ sensitivity: 'base' })
const filterState = reactive({
  search: '',
  filtered: {
    /** The count of all visible items. */
    count: 0,
    /** Map from visible item id to its search score. */
    items: new Map() as Map<string, number>,
    /** Set of groups with at least one visible item. */
    groups: new Set() as Set<string>,
  },
})

function filterItems() {
  if (!props.shouldFilter) {
    // Async / server filtering: treat every registered item as visible.
    filterState.filtered.count = allItems.value.size
    filterState.filtered.items = new Map(Array.from(allItems.value.keys()).map(id => [id, 1] as const))
    filterState.filtered.groups = new Set(allGroups.value.keys())
    return
  }
  if (!filterState.search) {
    filterState.filtered.count = allItems.value.size
    // Do nothing, each item will know to show itself because search is empty
    return
  }

  // Reset the groups
  filterState.filtered.groups = new Set()
  let itemCount = 0

  // Check which items should be included
  for (const [id, value] of allItems.value) {
    const score = contains(value, filterState.search)
    filterState.filtered.items.set(id, score ? 1 : 0)
    if (score)
      itemCount++
  }

  // Check which groups have at least 1 item shown
  for (const [groupId, group] of allGroups.value) {
    for (const itemId of group) {
      if (filterState.filtered.items.get(itemId)! > 0) {
        filterState.filtered.groups.add(groupId)
        break
      }
    }
  }

  filterState.filtered.count = itemCount
}

watch(() => filterState.search, () => {
  filterItems()
  if (!props.shouldFilter) {
    nextTick(() => clearHighlight())
  }
})

watch(() => allItems.value.size, () => {
  if (!props.shouldFilter) {
    filterItems()
    nextTick(() => clearHighlight())
  }
})

watch(() => allGroups.value.size, () => {
  if (!props.shouldFilter) {
    filterItems()
    nextTick(() => clearHighlight())
  }
})

provideCommandContext({
  allItems,
  allGroups,
  filterState,
})

function clearHighlight(): void {
  const inst = listboxRef.value as any
  if (!inst)
    return
  // ListboxRoot exposes highlightedElement as a ref
  const he = inst.highlightedElement
  if (he && typeof he === 'object' && 'value' in he) {
    he.value = null
  }
  else if ('highlightedElement' in inst) {
    inst.highlightedElement = null
  }
  // also blur any data-highlighted element
  if (typeof document !== 'undefined') {
    const highlighted = document.querySelectorAll<HTMLElement>('[data-highlighted]')
    highlighted.forEach(el => el.removeAttribute('data-highlighted'))
  }
}

onMounted(() => {
  if (!props.shouldFilter) {
    nextTick(() => clearHighlight())
  }
})
</script>

<template>
  <ListboxRoot
    ref="listboxRef"
    data-slot="command"
    v-bind="forwarded"
    :class="cn('bg-popover text-popover-foreground rounded-xl! p-1 flex size-full flex-col overflow-hidden', props.class)"
  >
    <slot />
  </ListboxRoot>
</template>
