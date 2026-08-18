<template>
  <div v-if="user" class="user-profile-wrapper">
    <div class="user-profile" @click="goToSteamProfile" tabindex="0" role="button" :aria-label="`Go to ${user.steamProfile.displayName}'s Steam profile`">
      <img :src="user.steamProfile.photos[0].value" :alt="user.steamProfile.displayName" class="user-avatar" />
      <span class="user-display-name">{{ user.steamProfile.displayName }}</span>
    </div>
    <button class="logout-btn" @click.stop="logout" aria-label="Logout" title="Logout">
      <LogOut class="logout-icon" />
    </button>
  </div>
  <button v-else @click="login" class="steam-login-btn" aria-label="Login with Steam">
    <img src="@/assets/steam_signin_large.png"
      alt="Sign in through Steam" style="height: 40px;" />
  </button>
</template>

<script>
import { LogOut } from 'lucide-vue-next'
import userStore from '../../stores/userStore'

export default {
  name: 'UserProfile',
  components: { LogOut },
  data() {
    return {
      user: null,
    }
  },
  async mounted() {
    this.user = await userStore.fetchUser(this.$backendApi)
  },
  methods: {
    login() {
      userStore.signIn(this.$backendApi)
    },
    goToSteamProfile() {
      if (!this.user?.steamProfile) return
      const profile = this.user.steamProfile
      const url = profile.profileUrl || profile?._json?.profileurl || profile.profileurl
      if (url) {
        window.open(url, '_blank')
      }
    },
    logout() {
      userStore.signOut(this.$backendApi)
    },
  },
}
</script>

<style scoped>

.user-profile-wrapper {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--primary-color-gradient);
  border-radius: 8px;
  padding: 6px 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.07);
  cursor: pointer;
}

.logout-btn {
  background: none;
  border: none;
  margin-left: 4px;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  transition: background 0.15s;
  cursor: pointer;
}
.logout-btn:hover, .logout-btn:focus {
  background: rgba(255,255,255,0.08);
}
.logout-icon {
  color: #b0b8c1;
  width: 20px;
  height: 20px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--primary-color);
}

.user-display-name {
  color: #fff;
  font-weight: 500;
  font-size: 1rem;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.steam-login-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
}

.steam-login-btn:hover {
  transform: translateY(-1px);
  transition: transform 0.2s ease;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.user-profile:hover {
  transform: translateY(-1px);
  transition: transform 0.2s ease;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.logout-btn:hover {
  transform: translateY(-1px);
  transition: transform 0.2s ease;
}
</style>
