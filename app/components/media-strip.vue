<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { backdropUrl } from '../lib/images'

interface Props {
  paths: string[]
}
const props = defineProps<Props>()

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
    <h2 class="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.06em] text-muted-foreground">
      {{ t('detail.media.heading') }}
      <span class="text-[11px] font-medium normal-case tracking-normal text-muted-foreground">
        {{ t('detail.media.hint') }}
      </span>
    </h2>
    <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <div
        v-for="path in visiblePaths"
        :key="path"
        class="aspect-video overflow-hidden rounded-lg bg-muted"
      >
        <img
          v-if="pathToUrl(path)"
          :src="pathToUrl(path) ?? undefined"
          :alt="t('detail.media.heading')"
          class="h-full w-full object-cover"
          loading="lazy"
        >
      </div>
    </div>
  </section>
</template>
