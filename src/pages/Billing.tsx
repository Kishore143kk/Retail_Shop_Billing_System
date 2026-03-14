import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  Receipt, 
  Search, 
  ShoppingCart,
  ChevronDown
} from 'lucide-react';
import { Product, BillItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export default function Billing() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<BillItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const addToCart = () => {
    if (!selectedProductId) return;
    
    const product = products.find(p => p.id === parseInt(selectedProductId));
    if (!product) return;

    if (product.stock < quantity) {
      alert(`Only ${product.stock} units available in stock.`);
      return;
    }

    const existingItemIndex = cart.findIndex(item => item.product_id === product.id);
    
    if (existingItemIndex > -1) {
      const newCart = [...cart];
      const newQuantity = newCart[existingItemIndex].quantity + quantity;
      
      if (product.stock < newQuantity) {
        alert(`Only ${product.stock} units available in stock.`);
        return;
      }

      newCart[existingItemIndex].quantity = newQuantity;
      newCart[existingItemIndex].total = newQuantity * product.price;
      setCart(newCart);
    } else {
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        price: product.price,
        quantity: quantity,
        total: product.price * quantity
      }]);
    }

    setSelectedProductId('');
    setQuantity(1);
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const gstAmount = subtotal * 0.18; // 18% GST
  const totalAmount = subtotal + gstAmount;

  const handleGenerateBill = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(item => ({
            id: item.product_id,
            name: item.product_name,
            price: item.price,
            quantity: item.quantity
          })),
          total_amount: totalAmount,
          customer_name: customerName,
          customer_phone: customerPhone
        })
      });
      const data = await res.json();
      navigate(`/invoice/${data.id}`);
    } catch (error) {
      console.error('Error generating bill:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create New Bill</h1>
          <p className="text-slate-500">Add products to generate a customer invoice.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Enter phone number"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Product</label>
              <div className="relative">
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
                >
                  <option value="">Choose a product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                      {p.name} - ₹{p.price.toFixed(2)} ({p.stock} in stock)
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Quantity</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>
          <button
            onClick={addToCart}
            disabled={!selectedProductId}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            Add to Bill
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              Billing Items
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Product</th>
                  <th className="px-6 py-4 font-semibold">Price</th>
                  <th className="px-6 py-4 font-semibold">Qty</th>
                  <th className="px-6 py-4 font-semibold">Total</th>
                  <th className="px-6 py-4 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence mode="popLayout">
                  {cart.map((item) => (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      key={item.product_id} 
                      className="hover:bg-slate-50 transition-all"
                    >
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">{item.product_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">₹{item.price.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{item.quantity}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">₹{item.total.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => removeFromCart(item.product_id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {cart.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                      No items added to the bill yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm sticky top-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Order Summary</h2>
          
          <div className="space-y-4 mb-8">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>CGST (9%)</span>
              <span>₹{(gstAmount / 2).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>SGST (9%)</span>
              <span>₹{(gstAmount / 2).toFixed(2)}</span>
            </div>
            <div className="h-px bg-slate-100 my-4"></div>
            <div className="flex justify-between text-xl font-bold text-slate-900">
              <span>Total</span>
              <span className="text-blue-600">₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handleGenerateBill}
            disabled={cart.length === 0 || loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Receipt className="w-5 h-5" />
            {loading ? 'Processing...' : 'Generate Invoice'}
          </button>
          
          <button
            onClick={() => setCart([])}
            disabled={cart.length === 0}
            className="w-full mt-3 text-slate-500 hover:text-red-500 text-sm font-medium py-2 transition-all disabled:opacity-0"
          >
            Clear All Items
          </button>
        </div>
      </div>
    </div>
  );
}
