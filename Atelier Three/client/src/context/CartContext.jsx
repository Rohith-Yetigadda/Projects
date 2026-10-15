import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
  getCart as fetchCartApi,
  addToCart as addToCartApi,
  updateCartQuantity as updateCartQuantityApi,
  removeFromCart as removeFromCartApi,
  getWishlist as fetchWishlistApi,
  addToWishlist as addToWishlistApi,
  removeFromWishlist as removeFromWishlistApi,
  toggleWishlist as toggleWishlistApi,
} from "../services/api";

const CartContext = createContext(null);

export function CartProvider({ children, user }) {
  // Cart state (Lab 05)
  const [cart, setCart] = useState([]);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState(null);

  // Wishlist state (Lab 04)
  const [wishlist, setWishlist] = useState([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistError, setWishlistError] = useState(null);

  // Fetch Cart from Backend
  const refreshCart = useCallback(async () => {
    if (!user) {
      setCart([]);
      return;
    }
    try {
      setCartLoading(true);
      setCartError(null);
      const data = await fetchCartApi();
      setCart(data.cart || []);
    } catch (err) {
      console.warn("Failed to fetch cart:", err.message);
      setCartError(err.response?.data?.message || "Failed to load cart");
    } finally {
      setCartLoading(false);
    }
  }, [user]);

  // Fetch Wishlist from Backend
  const refreshWishlist = useCallback(async () => {
    if (!user) {
      setWishlist([]);
      return;
    }
    try {
      setWishlistLoading(true);
      setWishlistError(null);
      const data = await fetchWishlistApi();
      setWishlist(data.wishlist || []);
    } catch (err) {
      console.warn("Failed to fetch wishlist:", err.message);
      setWishlistError(err.response?.data?.message || "Failed to load wishlist");
    } finally {
      setWishlistLoading(false);
    }
  }, [user]);

  // Re-fetch whenever user changes
  useEffect(() => {
    if (user) {
      refreshCart();
      refreshWishlist();
    } else {
      setCart([]);
      setWishlist([]);
    }
  }, [user, refreshCart, refreshWishlist]);

  // Derived values for Cart (Lab 05 Task 15)
  const cartCount = useMemo(() => {
    return cart.reduce((total, item) => total + (item.quantity || 1), 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((total, item) => {
      const price = item.product?.price || 0;
      return total + price * (item.quantity || 1);
    }, 0);
  }, [cart]);

  // Cart actions
  const addToCart = async (productId) => {
    if (!user) {
      throw new Error("Please log in to add items to your cart");
    }
    try {
      setCartError(null);
      const res = await addToCartApi(productId);
      if (res.cart) {
        setCart(res.cart);
      } else {
        await refreshCart();
      }
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to add to cart";
      setCartError(msg);
      throw new Error(msg);
    }
  };

  const updateQuantity = async (productId, quantity) => {
    if (!user) return;
    try {
      setCartError(null);
      const res = await updateCartQuantityApi(productId, quantity);
      if (res.cart) {
        setCart(res.cart);
      } else {
        await refreshCart();
      }
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to update quantity";
      setCartError(msg);
      throw new Error(msg);
    }
  };

  const removeFromCart = async (productId) => {
    if (!user) return;
    try {
      setCartError(null);
      const res = await removeFromCartApi(productId);
      if (res.cart) {
        setCart(res.cart);
      } else {
        await refreshCart();
      }
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to remove item";
      setCartError(msg);
      throw new Error(msg);
    }
  };

  const clearCartState = useCallback(() => {
    setCart([]);
  }, []);

  const isInCart = useCallback(
    (productId) => {
      return cart.some((item) => (item.product?._id || item.product) === productId);
    },
    [cart]
  );

  const getCartItemQuantity = useCallback(
    (productId) => {
      const found = cart.find(
        (item) => (item.product?._id || item.product) === productId
      );
      return found ? found.quantity : 0;
    },
    [cart]
  );

  // Wishlist actions (Lab 04)
  const wishlistCount = useMemo(() => {
    return wishlist.length;
  }, [wishlist]);

  const isWishlisted = useCallback(
    (productId) => {
      return wishlist.some(
        (item) => (item._id || item.id || item).toString() === productId?.toString()
      );
    },
    [wishlist]
  );

  const addToWishlist = async (productId) => {
    if (!user) throw new Error("Please log in to save items to your wishlist");
    try {
      setWishlistError(null);
      const res = await addToWishlistApi(productId);
      await refreshWishlist();
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to add to wishlist";
      setWishlistError(msg);
      throw new Error(msg);
    }
  };

  const removeFromWishlist = async (productId) => {
    if (!user) return;
    try {
      setWishlistError(null);
      const res = await removeFromWishlistApi(productId);
      // Optimistically or by fresh fetch
      setWishlist((prev) =>
        prev.filter((item) => (item._id || item).toString() !== productId.toString())
      );
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to remove from wishlist";
      setWishlistError(msg);
      throw new Error(msg);
    }
  };

  const toggleWishlist = async (productId) => {
    if (!user) throw new Error("Please log in to save items to your wishlist");
    try {
      setWishlistError(null);
      const res = await toggleWishlistApi(productId);
      await refreshWishlist();
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to toggle wishlist";
      setWishlistError(msg);
      throw new Error(msg);
    }
  };

  const value = {
    // Cart
    cart,
    cartCount,
    cartSubtotal,
    cartLoading,
    cartError,
    refreshCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCartState,
    isInCart,
    getCartItemQuantity,

    // Wishlist
    wishlist,
    wishlistCount,
    wishlistLoading,
    wishlistError,
    refreshWishlist,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    isWishlisted,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

export function useWishlist() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useWishlist must be used within a CartProvider");
  }
  return context;
}
