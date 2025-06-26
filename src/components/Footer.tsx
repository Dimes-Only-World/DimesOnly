import React, { useState } from 'react';

const Footer: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  const getRefUrl = (baseUrl: string) => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref') || 'default';
    return `${baseUrl}?ref=${encodeURIComponent(ref)}`;
  };

  return (
    <>
      <footer className="bg-black text-white py-6 text-center">
        <div className="space-y-2">
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <a href={getRefUrl('https://www.dimesonly.world/clothing')} className="hover:underline">
              ✅ Mens Clothing
            </a>
            <a href={getRefUrl('https://dimesonly.world/best')} className="hover:underline">
              ✅ Buy a Car
            </a>
            <a href="#" className="hover:underline">
              ✅ Profit Sharing
            </a>
            <a href={getRefUrl('https://forms.zohopublic.com/life1consultingcom/form/BestVehicleApplication1/formperma/NEo9COacNFYLprsXe56MgiJ772zuhzaS416FqnuDaVQ')} className="hover:underline">
              ✅ Apply Online
            </a>
            <a href={getRefUrl('https://forms.zohopublic.com/life1consultingcom/form/ContactUsNow/formperma/_ISOoxOqmHQHflLPn8otzT8wUFAuGgNStcpKqXof2BY')} className="hover:underline">
              ✅ Contact Us
            </a>
          </div>
          <div 
            className="text-blue-400 underline cursor-pointer hover:text-blue-300"
            onClick={openModal}
          >
            Privacy Policy
          </div>
          <p className="text-sm">© 2025 Housing Angels, LLC</p>
        </div>
      </footer>

      {/* Privacy Policy Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white text-black max-w-2xl max-h-[80vh] overflow-y-auto rounded-lg shadow-lg relative">
            <button 
              onClick={closeModal}
              className="absolute top-2 right-4 text-2xl font-bold hover:text-red-500 transition-colors"
            >
              ×
            </button>
            <div className="p-6">
              <h4 className="text-xl font-bold mb-4">PRIVACY POLICY</h4>
              <div className="text-sm space-y-4">
                <p><strong>Effective Date:</strong> March 9, 2025</p>
                <p>Housing Angels, LLC ("we," "our," or "us") is committed to protecting the privacy of our customers, partners, and website visitors.</p>
                <p>For the complete privacy policy and terms, please contact us at:</p>
                <p><strong>Email:</strong> Talent@DimesOnly.World<br/><strong>Phone:</strong> (929) 336-7634</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Footer;