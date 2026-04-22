/**
 * Products Feature Barrel Export
 */

export { useProducts, useProduct, useCategories } from './hooks/useProducts';
export { ProductService } from './services/productService';
export { calculateProductPrice, formatProductName, getProductStatus, getRatingDisplay, isNewProduct, getProductImage, truncateDescription } from './utils/productUtils';
