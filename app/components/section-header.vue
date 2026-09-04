<script setup lang="ts">
import SectionTitle from './section-title.vue'
import SeeMoreButton from './see-more-button.vue'

interface Props {
  title: string
  showSeeMore: boolean
}

const props = withDefaults(defineProps<Props>(), {})

const emit = defineEmits<{ seeMore: [] }>()
</script>

<template>
  <div class="mx-auto flex w-full max-w-[var(--max-content-width)] items-baseline gap-3.5 px-[var(--content-gutter)] pb-3">
    <SectionTitle :title="props.title" />
    <SeeMoreButton v-if="props.showSeeMore" :title="props.title" @see-more="emit('seeMore')" />
  </div>
</template>
