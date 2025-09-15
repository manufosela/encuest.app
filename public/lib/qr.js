import QRCode from 'https://cdn.skypack.dev/qrcode@1.5.4';

export const generateQRCode = async (url) => {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(url, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};