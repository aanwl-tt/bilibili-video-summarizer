export const BILIBILI_DOMAINS = ["bilibili.com", "www.bilibili.com"];

export const VIDEO_URL_PATTERN = /^\/video\/(BV\w+)/;

export const PLAYLIST_URL_PATTERN = /^\/(medialist\/detail\/\d+|collections\/detail\/\d+)/;

export const API_ENDPOINTS = {
  PAGELIST: "https://api.bilibili.com/x/player/pagelist",
  PLAYER_WBI_V2: "https://api.bilibili.com/x/player/wbi/v2",
  SUBTITLE_GET: "https://api.bilibili.com/x/player/v2",
  NAV: "https://api.bilibili.com/x/web-interface/nav",
  FAV_RESOURCE: "https://api.bilibili.com/x/v3/fav/resource/ids",
};
