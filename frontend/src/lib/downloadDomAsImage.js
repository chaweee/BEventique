// Utility to download a DOM node as an image using html2canvas
export async function downloadDomAsImage(domNode, filename = "receipt.jpg") {
  if (!window.html2canvas) {
    alert("html2canvas library not loaded.");
    return;
  }
  try {
    const canvas = await window.html2canvas(domNode, { backgroundColor: '#fff', scale: 2 });
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    alert("Failed to download image.");
  }
}
