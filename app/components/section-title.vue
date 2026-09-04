<script setup lang="ts">
interface Props {
  title: string
}

defineProps<Props>()
</script>

<template>
  <h3 class="text-heading-lg text-foreground">
    {{ title }}
  </h3>
</template>
