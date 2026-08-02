import React from 'react';
import { Link } from 'react-router-dom';
import DealBadge from './DealBadge';
import { MapPin, Maximize2, BedDouble, Building, ArrowRight, Edit, Trash2 } from 'lucide-react';

const PropertyCard = ({ property, onEdit, onDelete }) => {
  if (!property) return null;

  const defaultImage = "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80";
  const displayImage = (property.images && property.images.length > 0) 
    ? property.images[0] 
    : (property.gallery && property.gallery.length > 0 ? property.gallery[0].image : defaultImage);

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(2)} Cr`;
    }
    return `₹${(price / 100000).toFixed(2)} Lakh`;
  };

  return (
    <div className="glass-card group overflow-hidden flex flex-col justify-between h-full border border-[#12283C]/10 bg-white/90 hover:shadow-xl transition-all duration-300 relative">
      
      {/* Property Image Header */}
      <div className="relative aspect-[16/10] overflow-hidden bg-[#12283C]">
        <img
          src={displayImage}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => { e.target.src = defaultImage; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#12283C]/80 via-transparent to-transparent"></div>
        
        {/* Deal Rating Tag Badge */}
        <div className="absolute top-3 left-3 z-10">
          <DealBadge dealTag={property.deal_tag} />
        </div>

        {/* Owner Edit & Delete Buttons Overlay */}
        {(onEdit || onDelete) && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-xl">
            {onEdit && (
              <button
                onClick={(e) => { e.preventDefault(); onEdit(property); }}
                className="w-7 h-7 rounded-lg bg-white/20 hover:bg-[#B98B4E] text-white flex items-center justify-center transition-colors"
                title="Edit Property"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.preventDefault(); onDelete(property.id); }}
                className="w-7 h-7 rounded-lg bg-white/20 hover:bg-[#E2574C] text-white flex items-center justify-center transition-colors"
                title="Delete Property"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Property Type Badge */}
        <div className="absolute bottom-3 left-3 z-10 bg-[#12283C]/80 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-md font-medium">
          {property.property_type}
        </div>

        {/* City Indicator */}
        <div className="absolute bottom-3 right-3 z-10 text-white text-xs flex items-center gap-1 font-medium bg-black/40 backdrop-blur-sm px-2 py-1 rounded-md">
          <MapPin className="w-3 h-3 text-[#B98B4E]" /> {property.city}
        </div>
      </div>

      {/* Property Details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <span className="text-xs font-semibold text-[#5C6B73] uppercase tracking-wider block mb-1">
            {property.locality}, {property.sub_market}
          </span>
          
          <h3 className="font-serif text-xl font-semibold text-[#12283C] line-clamp-1 group-hover:text-[#B98B4E] transition-colors mb-3">
            {property.title}
          </h3>

          {/* Specs Grid */}
          <div className="grid grid-cols-3 gap-2 py-3 px-3 rounded-xl bg-[#F7F5F0] text-xs font-medium text-[#12283C] mb-4">
            <div className="flex items-center gap-1.5">
              <BedDouble className="w-4 h-4 text-[#B98B4E]" />
              <span>{property.bhk} BHK</span>
            </div>
            <div className="flex items-center gap-1.5 border-x border-[#12283C]/10 px-2 justify-center">
              <Maximize2 className="w-3.5 h-3.5 text-[#1F7A6C]" />
              <span className="data-mono">{property.area_sqft} sqft</span>
            </div>
            <div className="flex items-center gap-1.5 justify-end">
              <Building className="w-3.5 h-3.5 text-[#5C6B73]" />
              <span>Fl. {property.floor}/{property.total_floors}</span>
            </div>
          </div>
        </div>

        {/* Price & Action */}
        <div className="pt-3 border-t border-[#12283C]/08 flex items-center justify-between mt-auto">
          <div>
            <span className="text-[11px] text-[#5C6B73] font-medium block">Asking Price</span>
            <span className="data-mono text-lg font-bold text-[#12283C]">
              {formatPrice(property.listed_price)}
            </span>
          </div>

          <div className="text-right">
            {property.predicted_price && (
              <div>
                <span className="text-[10px] text-[#1F7A6C] font-bold block uppercase tracking-wider">ML Est.</span>
                <span className="data-mono text-sm font-semibold text-[#1F7A6C]">
                  {formatPrice(property.predicted_price)}
                </span>
              </div>
            )}
          </div>

          <Link
            to={`/properties/${property.id}`}
            className="w-9 h-9 rounded-xl bg-[#12283C] hover:bg-[#B98B4E] text-white flex items-center justify-center transition-colors shadow-md ml-2"
            title="View Details"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>

    </div>
  );
};

export default PropertyCard;
