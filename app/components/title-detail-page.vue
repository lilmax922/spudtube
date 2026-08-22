<script setup lang="ts">
import type { Kind } from '#server/tmdb/types'
import { ArrowLeft } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from '#imports'
import { useTitleDetail } from '../composables/use-title-detail'
import RecommendationsStrip from './recommendations-strip.vue'
import TitleFactsPanel from './title-facts-panel.vue'
import TitleIdentityBlock from './title-identity-block.vue'
import TitleNotFound from './title-not-found.vue'
import TitleTrailer from './title-trailer.vue'

interface Props {
  kind: Kind
}
const props = defineProps<Props>()

const route = useRoute()
const { t } = useI18n()

const { detail, recommendations } = useTitleDetail(
  props.kind,
  computed(() => route.params.id ?? ''),
)

const notFound = computed(() => {
  if (detail.pending.value)
    return false
  if (detail.data.value == null && detail.error.value == null)
    return true
  return detail.error.value?.statusCode === 400
})
const failed = computed(() => {
  if (detail.pending.value || detail.error.value == null)
    return false
  return detail.error.value.statusCode !== 400
})
</script>

<template>
  <div class="py-8">
    <p v-if="detail.pending.value" class="px-4 text-muted-foreground">
      {{ t('detail.loading') }}
    </p>
    <div v-else-if="failed" class="mx-auto max-w-6xl px-4 py-12 text-center">
      <p class="text-muted-foreground">
        {{ t('detail.error') }}
      </p>
      <NuxtLink
        to="/"
        class="mt-4 inline-flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        <ArrowLeft :size="16" :stroke-width="1.75" aria-hidden="true" />
        {{ t('detail.notFound.backHome') }}
      </NuxtLink>
    </div>
    <TitleNotFound v-else-if="notFound" />
    <template v-else-if="detail.data.value">
      <div class="mx-auto w-full max-w-6xl px-4">
        <div class="pb-2.5">
          <NuxtLink
            to="/"
            class="inline-flex items-center gap-1 rounded px-2 py-1 text-[13px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft :size="14" :stroke-width="1.75" aria-hidden="true" />
            {{ t('detail.back') }}
          </NuxtLink>
        </div>

        <div class="mb-8">
          <TitleIdentityBlock :detail="detail.data.value" />
        </div>

        <div class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr] md:gap-8">
          <aside class="flex flex-col gap-4">
            <TitleFactsPanel :detail="detail.data.value" />
          </aside>
          <main class="flex min-w-0 flex-col gap-4">
            <TitleTrailer :trailer-key="detail.data.value.trailerKey" />
          </main>
        </div>
      </div>

      <div class="mx-auto w-full max-w-6xl px-4">
        <RecommendationsStrip :titles="recommendations.data.value?.results ?? []" />
      </div>
    </template>
  </div>
</template>
