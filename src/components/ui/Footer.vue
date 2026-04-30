<template>
  <footer class="footer" role="contentinfo">
    <div class="footer-content">
      <!-- Social Media Icons Row -->
      <nav class="social-links" aria-label="Social media links">
        <a 
          href="https://danielbeltran.me" 
          target="_blank" 
          rel="noopener noreferrer"
          class="social-link"
          aria-label="Visit Daniel Beltran's portfolio website"
        >
          <WebsiteIcon aria-hidden/>
        </a>
        <a 
          href="https://github.com/dani-beltran" 
          target="_blank" 
          rel="noopener noreferrer"
          class="social-link"
          aria-label="Visit Daniel Beltran's GitHub profile"
        >
          <GitHubIcon aria-hidden/>
        </a>
        <a 
          href="https://x.com/danlbeltran" 
          target="_blank" 
          rel="noopener noreferrer"
          class="social-link"
          aria-label="Visit Daniel Beltran's Twitter/X profile"
        >
          <XIcon aria-hidden/>
        </a>
        <a 
          href="https://www.linkedin.com/in/daniellidonbeltran/" 
          target="_blank" 
          rel="noopener noreferrer"
          class="social-link"
          aria-label="Visit Daniel Beltran's LinkedIn profile"
        >
          <LinkedInIcon aria-hidden/>
        </a>
        <a 
          href="https://reddit.com/r/SteamDeck" 
          target="_blank" 
          rel="noopener noreferrer"
          class="social-link"
          aria-label="Visit Steam Deck subreddit"
        >
          <RedditIcon aria-hidden/>
        </a>
      </nav>
      
      <!-- Separator Line -->
      <div class="separator"></div>
      
      <div class="disclaimer-info">
        <span class="disclaimer-text">This site has no affiliation with Valve Software. All game images and logos are property of their respective owners.
</span>
      </div>
    </div>
  </footer>
</template>

<script>
import RedditIcon from '../icons/RedditIcon.vue'
import LinkedInIcon from '../icons/LinkedInIcon.vue'
import GitHubIcon from '../icons/GitHubIcon.vue'
import XIcon from '../icons/XIcon.vue'
import WebsiteIcon from '../icons/WebsiteIcon.vue'

export default {
  name: 'Footer',
  components: {
    RedditIcon,
    LinkedInIcon,
    GitHubIcon,
    WebsiteIcon,
    XIcon,
  },
}
</script>

<style scoped>
.footer {
  padding: 20px 0;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border-top: 1px solid #404040;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
}

.social-links {
  display: flex;
  gap: 16px;
  justify-content: center;
  align-items: center;
}

.social-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: #b8b8b8;
  text-decoration: none;
  border-radius: 50%;
  transition: all 0.3s ease;
  border: 1px solid #404040;
  background: rgba(255, 255, 255, 0.05);
}

.social-link:hover {
  background-color: #404040;
  color: #ffffff;
  transform: translateY(-2px);
  border-color: #666;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.social-link svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.separator {
  width: 100%;
  max-width: 400px;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #404040 20%, #606060 50%, #404040 80%, transparent 100%);
  margin: 0 auto;
}

.disclaimer-info {
  color: #b8b8b8;
  font-size: 0.8rem;
  max-width: 100%;
  line-height: 1.4;
  text-align: center;
}

.disclaimer-text {
  font-weight: 400;
}

@media (max-width: 768px) {
  .footer-content {
    padding: 0 16px;
    gap: 16px;
  }
  
  .social-links {
    gap: 12px;
  }
  
  .social-link {
    width: 36px;
    height: 36px;
  }
  
  .social-link svg {
    width: 18px;
    height: 18px;
  }
  
  .disclaimer-info {
    font-size: 0.75rem;
  }
}

@media (max-width: 480px) {
  .social-links {
    gap: 8px;
  }
  
  .social-link {
    width: 32px;
    height: 32px;
  }
  
  .social-link svg {
    width: 16px;
    height: 16px;
  }
}
</style>