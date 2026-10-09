// The client entry exists for its stylesheet: pages are rendered at build time
// and ship without the app bundle (render.csr = false in vite.config.js), but
// Vite still emits and links the CSS imported here.
import "./styles/site.css";
import "./styles/app.css";
