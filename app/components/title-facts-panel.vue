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

const originalNameLabel = computed(() => {
  const value = props.detail.originalName
  if (value == null || value === '')
    return '—'
  return value
})

const statusLabel = computed(() => {
  const value = props.detail.status
  if (value == null || value === '')
    return '—'
  return value
})

const originalLanguageLabel = computed(() => {
  const value = props.detail.originalLanguage
  if (value == null || value === '')
    return '—'
  return value.toUpperCase()
})

const budgetLabel = computed(() => formatUsd(props.detail.budget))
const revenueLabel = computed(() => formatUsd(props.detail.revenue))

const contentRatingLabel = computed(() => {
  const value = props.detail.contentRating
  if (value == null || value === '')
    return '—'
  return value
})

function formatUsd(value: number | null): string {
  if (value == null || value === 0)
    return '—'
  return `$${value.toLocaleString('en-US')}`
}
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

      <template v-if="detail.originalName">
        <dt class="font-medium text-muted-foreground">
          {{ t('detail.facts.originalName') }}
        </dt>
        <dd class="font-semibold text-foreground">
          {{ originalNameLabel }}
        </dd>
      </template>

      <template v-if="detail.status">
        <dt class="font-medium text-muted-foreground">
          {{ t('detail.facts.status') }}
        </dt>
        <dd class="font-semibold text-foreground">
          {{ statusLabel }}
        </dd>
      </template>

      <template v-if="detail.originalLanguage">
        <dt class="font-medium text-muted-foreground">
          {{ t('detail.facts.originalLanguage') }}
        </dt>
        <dd class="font-semibold tracking-wider text-foreground">
          {{ originalLanguageLabel }}
        </dd>
      </template>

      <template v-if="detail.kind === 'MOVIE'">
        <dt class="font-medium text-muted-foreground">
          {{ t('detail.facts.budget') }}
        </dt>
        <dd class="font-semibold tabular-nums text-foreground">
          {{ budgetLabel }}
        </dd>

        <dt class="font-medium text-muted-foreground">
          {{ t('detail.facts.revenue') }}
        </dt>
        <dd class="font-semibold tabular-nums text-foreground">
          {{ revenueLabel }}
        </dd>
      </template>

      <template v-if="detail.contentRating">
        <dt class="font-medium text-muted-foreground">
          {{ t('detail.facts.contentRating') }}
        </dt>
        <dd class="font-semibold text-foreground">
          {{ contentRatingLabel }}
        </dd>
      </template>
    </dl>
  </section>
</template>
