<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { backdropUrl } from '../lib/images'

interface Props {
  paths: string[]
}
const props = defineProps<Props>()

const emit = defineEmits<{
  open: [index: number]
}>()

const { t } = useI18n()

const visiblePaths = computed(() => props.paths.slice(0, 6))

function pathToUrl(path: string): string | null {
  return backdropUrl(path)
}
</script>

<template>
  <section
    v-if="visiblePaths.length > 0"
    class="border-t border-border py-6"
    :aria-label="t('detail.media.heading')"
  >
    <h2 class="mb-4 text-heading-lg text-foreground">
      {{ t('detail.media.heading') }}
    </h2>
    <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <button
        v-for="(path, index) in visiblePaths"
        :key="path"
        type="button"
        class="group aspect-video cursor-pointer overflow-hidden rounded-lg bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
        :aria-label="t('detail.media.open', { index: index + 1, total: visiblePaths.length })"
        @click="emit('open', index)"
      >
        <img
          v-if="pathToUrl(path)"
          :src="pathToUrl(path) ?? undefined"
          :alt="t('detail.media.heading')"
          class="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
          loading="lazy"
          draggable="false"
        >
      </button>
    </div>
  </section>
</template>
