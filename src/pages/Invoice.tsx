import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Printer, 
  Download, 
  ArrowLeft, 
  ShoppingBag,
  CheckCircle,
  MessageCircle
} from 'lucide-react';
import { Bill } from '../types';
import { motion } from 'motion/react';

export default function Invoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchBill = async () => {
      try {
        const res = await fetch(`/api/bills/${id}`);
        const data = await res.json();
        setBill(data);
      } catch (error) {
        console.error('Error fetching bill:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBill();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="flex items-center justify-center h-full">Loading invoice...</div>;
  if (!bill) return <div className="text-center py-20">Invoice not found.</div>;

  const subtotal = bill.items?.reduce((sum, item) => sum + item.total, 0) || 0;
  // Make sure to use the final total amount generated which includes GST
  const gstAmount = subtotal * 0.18;

  const handleWhatsApp = () => {
    if (!bill) return;
    const itemsText = bill.items?.map(i => `- ${i.product_name} x${i.quantity} : ₹${i.total.toFixed(2)}`).join('%0A') || '';
    const text = `*Retail Billing Pro - Invoice #BILL-${bill.id}*%0A%0A*Customer:* ${bill.customer_name || 'Walk-in Customer'}%0A*Date:* ${new Date(bill.date).toLocaleDateString()}%0A%0A*Order Details:*%0A${itemsText}%0A%0A*Subtotal:* ₹${subtotal.toFixed(2)}%0A*GST (18%):* ₹${gstAmount.toFixed(2)}%0A*Total Amount:* ₹${bill.total_amount.toFixed(2)}%0A%0AThank you for shopping with us!`;
    
    // Clean phone number (e.g. remove spaces/dashes), optionally pre-pend country code if missing
    let phone = bill.customer_phone ? bill.customer_phone.replace(/\D/g, '') : '';
    // If phone length is 10, assume Indian number and prepend 91 (based on context)
    if (phone.length === 10) phone = `91${phone}`;
    
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between print:hidden">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-medium transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-3">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            <Printer className="w-4 h-4" />
            Print Invoice
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 print:hidden">
            <Download className="w-4 h-4" />
            Download PDF
          </button>
          <button 
            onClick={handleWhatsApp}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-all shadow-lg shadow-green-100 print:hidden"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </button>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        ref={invoiceRef}
        className="bg-white rounded-2xl border border-slate-200 shadow-xl p-12 print:shadow-none print:border-none print:p-0"
      >
        <div className="flex justify-between items-start mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <ShoppingBag className="text-white w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Retail Billing Pro</h1>
            </div>
            <p className="text-slate-500 text-sm">123 Business Street, Suite 100</p>
            <p className="text-slate-500 text-sm">City, State 12345</p>
            <p className="text-slate-500 text-sm">Phone: (555) 123-4567</p>
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-black text-slate-200 uppercase mb-2">Invoice</h2>
            <p className="text-slate-900 font-bold">#BILL-{bill.id}</p>
            <p className="text-slate-500 text-sm mt-1">{new Date(bill.date).toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-12">
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Bill To:</h3>
            <p className="text-slate-900 font-bold">{bill.customer_name || 'Cash Customer'}</p>
            <p className="text-slate-500 text-sm">{bill.customer_phone || 'Walk-in Client'}</p>
          </div>
          <div className="text-right">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Shop Details:</h3>
            <p className="text-slate-900 font-bold">Retail Billing Pro</p>
            <p className="text-slate-500 text-sm">GSTIN: 22AAAAA0000A1Z5</p>
          </div>
        </div>

        <table className="w-full text-left mb-12">
          <thead className="border-b-2 border-slate-900">
            <tr>
              <th className="py-4 font-bold text-slate-900">Product</th>
              <th className="py-4 font-bold text-slate-900 text-center">Price</th>
              <th className="py-4 font-bold text-slate-900 text-center">Qty</th>
              <th className="py-4 font-bold text-slate-900 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bill.items?.map((item, idx) => (
              <tr key={idx}>
                <td className="py-4 text-slate-900 font-medium">{item.product_name}</td>
                <td className="py-4 text-slate-600 text-center">₹{item.price.toFixed(2)}</td>
                <td className="py-4 text-slate-600 text-center">{item.quantity}</td>
                <td className="py-4 text-slate-900 font-bold text-right">₹{item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-16">
          <div className="w-64 space-y-3">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>CGST (9%)</span>
              <span>₹{(gstAmount / 2).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>SGST (9%)</span>
              <span>₹{(gstAmount / 2).toFixed(2)}</span>
            </div>
            <div className="h-px bg-slate-200 my-2"></div>
            <div className="flex justify-between text-xl font-bold text-slate-900">
              <span>Total</span>
              <span className="text-blue-600">₹{bill.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="text-center pt-12 border-t border-slate-100">
          <div className="flex items-center justify-center gap-2 text-green-600 font-bold mb-2">
            <CheckCircle className="w-5 h-5" />
            <span>Payment Received</span>
          </div>
          <p className="text-slate-900 font-bold text-lg">Thank You! Visit Again.</p>
          <p className="text-slate-400 text-xs mt-2">Retail Billing Pro • 123 Business Street • City, State • Phone: (555) 123-4567</p>
          <p className="text-slate-400 text-[10px] mt-1 italic">This is a computer-generated invoice and does not require a physical signature.</p>
        </div>
      </motion.div>
    </div>
  );
}
