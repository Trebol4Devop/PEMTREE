export function getNodeDimensions() {
    const isMobile = window.innerWidth <= 768;
    const baseHeight = isMobile ? 60 : 90;
    const height = Math.round(baseHeight * 0.6);
    const width = height * 5;
    return { width, height };
}
