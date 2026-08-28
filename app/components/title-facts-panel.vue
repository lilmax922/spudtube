<script setup lang="ts">
import type { TitleDetail } from '#server/tmdb/types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface Props {
  detail: TitleDetail
}
const props = defineProps<Props>()

const { t, locale } = useI18n()

interface FactCell {
  key: 'released' | 'originalName' | 'status' | 'originalLanguage' | 'budget' | 'revenue'
  value: string
  numeric: boolean
}

const facts = computed<FactCell[]>(() => {
  const detail = props.detail
  const cells: FactCell[] = []
  if (detail.releaseDate)
    cells.push({ key: 'released', value: formatReleaseDate(detail.releaseDate), numeric: true })
  if (detail.originalName)
    cells.push({ key: 'originalName', value: detail.originalName, numeric: false })
  if (detail.status)
    cells.push({ key: 'status', value: detail.status, numeric: false })
  if (detail.originalLanguage)
    cells.push({ key: 'originalLanguage', value: detail.originalLanguage.toUpperCase(), numeric: false })
  if (detail.kind === 'MOVIE') {
    if (detail.budget)
      cells.push({ key: 'budget', value: formatUsd(detail.budget), numeric: true })
    if (detail.revenue)
      cells.push({ key: 'revenue', value: formatUsd(detail.revenue), numeric: true })
  }
  return cells
})

function formatReleaseDate(value: string): string {
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString('en-US')}`
}
</script>

<template>
  <section
    v-if="facts.length > 0"
    class="border-t border-border py-6"
    :aria-label="t('detail.facts.heading')"
  >
    <h2 class="mb-4 flex items-center gap-2 text-heading-lg text-foreground">
      {{ t('detail.facts.heading') }}
    </h2>
    <dl class="grid gap-x-6 gap-y-5 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
      <div v-for="cell in facts" :key="cell.key">
        <dt class="text-caption-sm font-medium text-muted-foreground">
          {{ t(`detail.facts.${cell.key}`) }}
        </dt>
        <dd
          class="mt-1 break-words text-body-lg font-semibold text-foreground"
          :class="cell.numeric && 'tabular-nums'"
        >
          {{ cell.value }}
        </dd>
      </div>
    </dl>
  </section>
</template>
