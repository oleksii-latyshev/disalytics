/**
 * What jsPDF's optional peers (`html2canvas`, `dompurify`, `canvg`) resolve to. jsPDF loads them
 * only for `.html()` and SVG input, which the tactic PDF never uses, and a bundler would otherwise
 * ship and precache all three — about 380 kB — as chunks nothing ever fetches.
 */
export default undefined;
