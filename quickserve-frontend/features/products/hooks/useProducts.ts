/**
 * useProducts Hook
 *
 * Product data fetching hook
 * When ready, integrate with React Query for caching
 */

import { useState, useEffect, useMemo } from 'react';
import type { Product, Category } from '@/types';
import { ProductService } from '../services/productService';

export interface UseProductsOptions {
  category?: string;
  featured?: boolean;
  popular?: boolean;
  searchQuery?: string;
}

/**
 * useProducts Hook
 */
export function useProducts(options: UseProductsOptions = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchProducts() {
      try {
        setLoading(true);
        setError(null);

        let result: Product[] = [];

        if (options.featured) {
          result = await ProductService.getFeaturedProducts();
        } else if (options.popular) {
          result = await ProductService.getPopularProducts();
        } else if (options.searchQuery) {
          result = await ProductService.searchProducts(options.searchQuery);
        } else if (options.category) {
          result = await ProductService.getProductsByCategory(options.category);
        } else {
          result = await ProductService.getAllProducts();
        }

        if (isMounted) {
          setProducts(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [options.category, options.featured, options.popular, options.searchQuery]);

  return {
    products,
    loading,
    error,
    isEmpty: products.length === 0 && !loading,
  };
}

/**
 * useProduct Hook - Get single product
 */
export function useProduct(id: number | string) {
  const [product, setProduct] = useState<Product | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchProduct() {
      try {
        setLoading(true);
        setError(null);

        const result = await ProductService.getProductById(id);

        if (isMounted) {
          setProduct(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchProduct();

    return () => {
      isMounted = false;
    };
  }, [id]);

  return {
    product,
    loading,
    error,
    notFound: !product && !loading && !error,
  };
}

/**
 * useCategories Hook
 */
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchCategories() {
      try {
        const result = await ProductService.getAllCategories();
        if (isMounted) {
          setCategories(result);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    categories,
    loading,
  };
}
