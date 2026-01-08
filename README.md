# Steam Deck Settings Database

A comprehensive web application that allows users to query a database with collected information about optimal game settings for Steam Deck hardware.

## 🎮 Features

- **Game Search**: Search for Steam games by name with real-time results
- **Community Game Reports**: Access a curated database of community-reported optimal settings for thousands of games
- **AI-Generated Summaries**: Get concise summaries of game performance and settings recommendations
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Accessibility**: Full WCAG compliance with keyboard navigation and screen reader support

## 🚀 Live Demo

Visit the live application: [DeckuDB](https://deckudb.com)

## 🛠 Technical Stack

- **Frontend**: Vue.js 3
- **Routing**: Vue Router 4
- **Build Tool**: Vite
- **Icons**: Lucide Vue Next
- **HTTP Client**: Axios
- **Styling**: CSS3 with CSS Grid and Flexbox
- **API Integration**: Steam Web API and custom backend services

## 📱 Application Structure

### Routes
- `/` - Home page with game search functionality
- `/game/:gameId` - Individual game page
- `/search` - Search results page

## 🏗 Development

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation
Download the repository and install dependencies:
```bash
npm install
```

### Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## 📊 Data Sources

Game Reports are aggregated from various community sources, including:
- Community forums and guides, such as Reddit and Steam Community.
- Dedicated Steam Deck optimization websites, like ProtonDB, Deck Verified, ShareDeck, etc.
- YouTube tutorials and gameplay analysis
- Media articles

> **Disclaimer**: Recommendations are community-sourced and may not be suitable for every system configuration. Users assume all risks when applying settings.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🎮 Community

Join the conversation and share your experiences:
- [Discord Server](https://discord.gg/e5q4QqfVQx)

---

*Built with ❤️ for the Steam Deck gaming community*
