<script setup lang="ts">
import type { TitleDetail } from '#server/tmdb/types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { kindLabelKey } from '../lib/kind'

interface Props {
  detail: TitleDetail
}
const props = defineProps<Props>()

const { t } = useI18n()

const kindLabel = computed(() => t(kindLabelKey(props.detail.kind)))

const releaseYear = computed(() => props.detail.releaseDate?.slice(0, 4) ?? null)
const releaseLabel = computed(() => releaseYear.value ?? '—')

const runtimeLabel = computed(() => {
  if (props.detail.runtimeMinutes == null)
    return '—'
  return t('detail.runtimeMinutes', { minutes: props.detail.runtimeMinutes })
})
</script>

<template>
  <section
    class="rounded-lg bg-card p-5 shadow-[0_4px_12px_rgba(0,0,0,0.25)] backdrop-blur-[12px]"
    :aria-label="t('detail.facts.heading')"
  >
    <h2 class="mb-3 text-[16.5px] font-bold tracking-tight text-foreground">
      {{ t('detail.facts.heading') }}
    </h2>
    <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
      <dt class="text-muted-foreground">
        {{ t('detail.facts.kind') }}
      </dt>
      <dd class="text-right font-medium text-foreground">
        {{ kindLabel }}
      </dd>

      <dt class="text-muted-foreground">
        {{ t('detail.facts.released') }}
      </dt>
      <dd class="text-right font-medium text-foreground">
        {{ releaseLabel }}
      </dd>

      <dt class="text-muted-foreground">
        {{ t('detail.facts.runtime') }}
      </dt>
      <dd class="text-right font-medium text-foreground">
        {{ runtimeLabel }}
      </dd>
    </dl>
  </section>
</template>
