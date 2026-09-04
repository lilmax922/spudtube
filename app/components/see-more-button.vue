<script setup lang="ts">
import { ChevronRight } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

interface Props {
  title: string
}

const props = withDefaults(defineProps<Props>(), {})

const emit = defineEmits<{ seeMore: [] }>()

const { t } = useI18n()
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-button-md font-bold text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
    :aria-label="t('browse.seeMoreAria', { title: props.title })"
    @click="emit('seeMore')"
  >
    {{ t('browse.seeMore') }}
    <ChevronRight :size="14" :stroke-width="2.2" aria-hidden="true" class="opacity-90" />
  </button>
</template>
