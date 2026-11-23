/* OPTIONAL: Wix Custom Element proof-of-concept for upgraded Wix sites.
 * Wix's standard Embed Site iframe is fixed-height and this code cannot alter that limitation.
 * In Wix Editor: Add Elements > Embed Code > Custom Element > Server URL
 * URL: https://thebibertybee.github.io/biberty-bee-leaderboard/biberty-dashboard/wix-autoheight-element.js
 * Tag: biberty-analytics-embed
 * Wix may still constrain the outer element/section height; verify on the published site. */
(() => {
  const DASHBOARD_URL = 'https://thebibertybee.github.io/biberty-bee-leaderboard/biberty-dashboard/';
  const ORIGIN = new URL(DASHBOARD_URL).origin;
  class BibertyAnalyticsEmbed extends HTMLElement {
    connectedCallback() {
      if (this._frame) return;
      this.style.display = 'block';
      this.style.width = '100%';
      const root = this.attachShadow({mode:'open'});
      const iframe = document.createElement('iframe');
      iframe.title = 'Biberty Analytics';
      iframe.src = DASHBOARD_URL;
      iframe.loading = 'eager';
      iframe.style.cssText = 'display:block;width:100%;height:1800px;border:0;overflow:hidden';
      iframe.setAttribute('scrolling','no');
      root.appendChild(iframe);
      this._frame = iframe;
      this._onHeight = event => {
        const data = event.data;
        if (event.origin !== ORIGIN || event.source !== iframe.contentWindow || !data || data.type !== 'biberty-dashboard:height') return;
        const height = Math.ceil(Number(data.height));
        if (!Number.isFinite(height) || height < 250 || height > 40000) return;
        iframe.style.height = `${height}px`;
        this.style.height = `${height}px`;
      };
      window.addEventListener('message',this._onHeight);
    }
    disconnectedCallback() {
      if (this._onHeight) window.removeEventListener('message',this._onHeight);
    }
  }
  if (!customElements.get('biberty-analytics-embed')) customElements.define('biberty-analytics-embed',BibertyAnalyticsEmbed);
})();
