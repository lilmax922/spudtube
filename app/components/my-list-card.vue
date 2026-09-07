<script setup lang="ts">
import type { MyListEntry } from '#server/api/my-list.get'
import type { RatingLabel, WatchStatus } from '#shared/personal-tracking/personal-tracking'
import type { PersonalTrackingState } from '../composables/use-personal-tracking'
import { Clapperboard } from '@lucide/vue'
import { computed, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFetch } from '#imports'
import { usePersonalTracking } from '../composables/use-personal-tracking'
import { authClient } from '../lib/auth-client'
import { posterSrcSet, posterUrl, providerLogoSrcSet, providerLogoUrl } from '../lib/images'
import { kindLabelKey, titleDetailPath } from '../lib/kind'
import RatingTrio from './rating-trio.vue'
import TitleStatusToggle from './title-status-toggle.vue'

interface Props {
  entry: MyListEntry
}

const props = defineProps<Props>()

const emit = defineEmits<{
  updated: [payload: { kind: MyListEntry['kind'], tmdbId: number, previous: WatchStatus | RatingLabel | null, next: WatchStatus | RatingLabel | null, type: 'status' | 'rating' }]
  signInRequested: []
}>()

const { t } = useI18n()

const detailPath = computed(() => titleDetailPath(props.entry.kind, props.entry.tmdbId))

const year = computed(() => props.entry.title?.releaseDate?.slice(0, 4) ?? null)
const kindLabel = computed(() => t(kindLabelKey(props.entry.kind)))
const voteText = computed(() => {
  const v = props.entry.title?.voteAverage
  return v != null ? v.toFixed(1) : null
})
const overview = computed(() => {
  const raw = props.entry.title?.overview
  return raw != null && raw.trim().length > 0 ? raw.trim() : null
})

const posterSrc = computed(() => props.entry.title?.posterPath ? posterUrl(props.entry.title.posterPath) : null)
const imageFailed = ref(false)
watch(() => props.entry.title?.posterPath, () => {
  imageFailed.value = false
})

const { data: session } = await authClient.useSession(useFetch)
const signedIn = computed(() => session.value?.user != null)

const id = computed(() => String(props.entry.tmdbId))

// One tracking instance per card, created on the first user intent so mounting
// the list never fires per-title reads. Until then the entry props render.
// The module owns the optimistic flip and the revert; the card only forwards
// the settled result so the page can adjust its list structure.
const tracking = shallowRef<PersonalTrackingState | null>(null)

function tracker(): PersonalTrackingState {
  const existing = tracking.value
  if (existing)
    return existing
  const created = usePersonalTracking(props.entry.kind, id, signedIn)
  created.state.value = {
    rating: props.entry.ratingLabel ?? null,
    status: props.entry.status ?? null,
  }
  tracking.value = created
  return created
}

// Page patches (toast undo) flow back into the module state.
watch(() => props.entry.status, (next) => {
  const current = tracking.value
  if (current)
    current.state.value = { ...current.state.value, status: next ?? null }
})
watch(() => props.entry.ratingLabel, (next) => {
  const current = tracking.value
  if (current)
    current.state.value = { ...current.state.value, rating: next ?? null }
})

const displayStatus = computed(() => tracking.value?.state.value.status ?? props.entry.status ?? null)
const displayRating = computed(() => tracking.value?.state.value.rating ?? props.entry.ratingLabel ?? null)
const busy = computed(() => tracking.value?.pending.value ?? false)

async function onSetStatus(target: WatchStatus): Promise<void> {
  const current = tracker()
  const previous = current.state.value.status
  if (previous === target)
    await current.clear('status')
  else
    await current.setStatus(target)
  const next = current.state.value.status
  if (next !== previous)
    emit('updated', { kind: props.entry.kind, tmdbId: props.entry.tmdbId, previous, next, type: 'status' })
}

async function onClearStatus(): Promise<void> {
  const current = tracker()
  const previous = current.state.value.status
  if (previous == null)
    return
  await current.clear('status')
  const next = current.state.value.status
  if (next !== previous)
    emit('updated', { kind: props.entry.kind, tmdbId: props.entry.tmdbId, previous, next, type: 'status' })
}

async function onRatingSelect(label: RatingLabel): Promise<void> {
  const current = tracker()
  const previous = current.state.value.rating
  await current.rate(label)
  const next = current.state.value.rating
  if (next !== previous)
    emit('updated', { kind: props.entry.kind, tmdbId: props.entry.tmdbId, previous, next, type: 'rating' })
}

async function onRatingClear(): Promise<void> {
  const current = tracker()
  const previous = current.state.value.rating
  if (previous == null)
    return
  await current.clear('rating')
  const next = current.state.value.rating
  if (next !== previous)
    emit('updated', { kind: props.entry.kind, tmdbId: props.entry.tmdbId, previous, next, type: 'rating' })
}

function onSignInRequested(): void {
  emit('signInRequested')
}

const visibleProviders = computed(() => props.entry.providers.slice(0, 5))
const extraProviderCount = computed(() => Math.max(0, props.entry.providers.length - 5))
</script>

<template>
  <article
    class="group flex gap-3 rounded-xl bg-card p-2.5 shadow-[0_4px_12px_rgba(0,0,0,0.25)] transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
    :aria-label="props.entry.title?.name ?? t('myList.removed')"
  >
    <!-- poster: narrowed to ~36% so content breathes; 2:3 keeps 12px radius per spec -->
    <NuxtLink
      :to="detailPath"
      class="relative block aspect-[2/3] w-[36%] shrink-0 overflow-hidden rounded-lg bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
      tabindex="0"
      :aria-label="props.entry.title?.name ?? t('myList.removed')"
    >
      <NuxtImg
        v-if="posterSrc && !imageFailed && props.entry.title"
        :src="posterSrc"
        :srcset="posterSrcSet(props.entry.title.posterPath)"
        sizes="140px sm:160px"
        :alt="props.entry.title.name"
        loading="lazy"
        decoding="async"
        class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        @error="imageFailed = true"
      />
      <div
        v-else
        class="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-2 text-center text-muted-foreground"
      >
        <Clapperboard :size="20" :stroke-width="1.75" aria-hidden="true" />
        <span class="line-clamp-3 text-caption-sm">
          {{ props.entry.title?.name ?? t('myList.removed') }}
        </span>
      </div>
      <span
        v-if="props.entry.title"
        class="absolute left-1.5 top-1.5 rounded-md bg-background/75 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground backdrop-blur"
      >
        {{ kindLabel }}
      </span>
    </NuxtLink>

    <!-- content -->
    <div class="flex min-w-0 flex-1 flex-col justify-between py-0.5">
      <div class="min-w-0">
        <NuxtLink
          :to="detailPath"
          class="line-clamp-2 text-body-sm-strong text-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
        >
          {{ props.entry.title?.name ?? t('myList.removed') }}
        </NuxtLink>
        <div class="mt-1 flex flex-wrap items-center gap-1.5 text-caption-md text-muted-foreground">
          <span v-if="year" class="tabular-nums">{{ year }}</span>
          <span v-if="year" aria-hidden="true">·</span>
          <span>{{ kindLabel }}</span>
          <template v-if="voteText">
            <span aria-hidden="true">·</span>
            <span class="inline-flex items-center gap-1 tabular-nums"><span aria-hidden="true">★</span> {{ voteText }}</span>
          </template>
        </div>

        <p
          v-if="overview"
          class="mt-2 line-clamp-2 text-caption-md leading-relaxed text-muted-foreground"
        >
          {{ overview }}
        </p>

        <!-- provider row -->
        <div v-if="visibleProviders.length > 0" class="mt-2.5 flex items-center gap-1.5">
          <div class="flex min-w-0 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <template v-for="provider in visibleProviders" :key="provider.id">
              <a
                v-if="props.entry.watchLink"
                :href="props.entry.watchLink"
                target="_blank"
                rel="noopener noreferrer"
                :title="provider.name"
                :aria-label="provider.name"
                class="shrink-0 rounded-[20%] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
              >
                <span class="flex h-7 w-7 items-center justify-center overflow-hidden rounded-[20%] bg-muted">
                  <NuxtImg
                    v-if="provider.logoPath"
                    :src="providerLogoUrl(provider.logoPath) ?? undefined"
                    :srcset="providerLogoSrcSet(provider.logoPath) ?? undefined"
                    sizes="28px"
                    :alt="provider.name"
                    loading="lazy"
                    decoding="async"
                    class="h-full w-full object-cover"
                  />
                  <span v-else class="text-[9px] font-bold leading-none text-muted-foreground">{{ provider.name.slice(0, 2).toUpperCase() }}</span>
                </span>
              </a>
              <span
                v-else
                :title="provider.name"
                class="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[20%] bg-muted"
              >
                <NuxtImg
                  v-if="provider.logoPath"
                  :src="providerLogoUrl(provider.logoPath) ?? undefined"
                  :srcset="providerLogoSrcSet(provider.logoPath) ?? undefined"
                  sizes="28px"
                  :alt="provider.name"
                  loading="lazy"
                  decoding="async"
                  class="h-full w-full object-cover"
                />
                <span v-else class="text-[9px] font-bold leading-none text-muted-foreground">{{ provider.name.slice(0, 2).toUpperCase() }}</span>
              </span>
            </template>
            <span
              v-if="extraProviderCount > 0"
              class="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-caption-sm font-medium tabular-nums text-muted-foreground"
            >
              +{{ extraProviderCount }}
            </span>
          </div>
        </div>
        <div v-else class="mt-2.5 text-caption-sm text-muted-foreground/70">
          {{ t('availability.unavailable') }}
        </div>
      </div>

      <!-- action bar: watchlist / watched + rating (no separator per spec) -->
      <div class="mt-3 flex flex-wrap items-center gap-1.5">
        <TitleStatusToggle
          :status="displayStatus"
          :signed-in="signedIn"
          :pending="busy"
          @set-status="onSetStatus"
          @clear-status="onClearStatus"
          @sign-in-requested="onSignInRequested"
        />

        <RatingTrio
          :label="displayRating"
          :signed-in="signedIn"
          :pending="busy"
          compact
          @select="onRatingSelect"
          @clear="onRatingClear"
          @sign-in-requested="onSignInRequested"
        />
      </div>
    </div>
  </article>
</template>
