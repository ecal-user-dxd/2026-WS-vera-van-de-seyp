<!-- `/` always redirects to the first artist (see +page.js); shown only if the
     artist list is empty. -->
<main class="empty">
	<p>No artists found.</p>
</main>

<style>
	.empty {
		min-height: 100vh;
		display: grid;
		place-items: center;
	}
</style>
