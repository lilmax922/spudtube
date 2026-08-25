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
    class="border-t border-border py-6 first:border-t-0"
    :aria-label="t('detail.facts.heading')"
  >
    <h2 class="mb-3.5 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.06em] text-muted-foreground">
      {{ t('detail.facts.heading') }}
    </h2>
    <dl class="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2.5 text-[13px]">
      <dt class="font-medium text-muted-foreground">
        {{ t('detail.facts.kind') }}
      </dt>
      <dd class="font-semibold text-foreground">
        {{ kindLabel }}
      </dd>

      <dt class="font-medium text-muted-foreground">
        {{ t('detail.facts.released') }}
      </dt>
      <dd class="font-semibold tabular-nums text-foreground">
        {{ releaseLabel }}
      </dd>

      <dt class="font-medium text-muted-foreground">
        {{ t('detail.facts.runtime') }}
      </dt>
      <dd class="font-semibold tabular-nums text-foreground">
        {{ runtimeLabel }}
      </dd>
    </dl>
  </section>
</template>
