import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("billing.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    price REAL NOT NULL,
    stock INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    total_amount REAL NOT NULL,
    customer_name TEXT,
    customer_phone TEXT
  );

  CREATE TABLE IF NOT EXISTS bill_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER,
    product_id INTEGER,
    product_name TEXT,
    price REAL,
    quantity INTEGER,
    total REAL,
    FOREIGN KEY (bill_id) REFERENCES bills (id)
  );
`);

// Migration for existing databases
try {
  db.exec("ALTER TABLE bills ADD COLUMN customer_name TEXT");
} catch (e) {}
try {
  db.exec("ALTER TABLE bills ADD COLUMN customer_phone TEXT");
} catch (e) {}

// Seed data if less than 70 products
const productCount = db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number };
if (productCount.count < 70) {
  const insert = db.prepare("INSERT INTO products (name, category, price, stock) VALUES (?, ?, ?, ?)");
  const categories = ["Dairy", "Bakery", "Grains", "Beverages", "Snacks", "Personal Care", "Household", "Stationery"];
  const productNames = [
    "Milk", "Bread", "Eggs", "Rice", "Wheat Flour", "Sugar", "Salt", "Tea", "Coffee", "Butter",
    "Cheese", "Yogurt", "Biscuits", "Chips", "Chocolate", "Soap", "Shampoo", "Toothpaste", "Detergent", "Dishwash",
    "Cooking Oil", "Ghee", "Pulses", "Spices", "Honey", "Jam", "Ketchup", "Noodles", "Pasta", "Oats",
    "Cornflakes", "Juice", "Soft Drink", "Water Bottle", "Ice Cream", "Frozen Peas", "Paneer", "Curd", "Pickle", "Papad",
    "Handwash", "Sanitizer", "Face Wash", "Body Lotion", "Hair Oil", "Deodorant", "Floor Cleaner", "Glass Cleaner", "Napkins", "Garbage Bags",
    "Notebook", "Blue Pen", "Black Pen", "Pencil Set", "Eraser", "Sharpener", "Ruler", "Geometry Box", "School Bag", "Lunch Box",
    "Crayons", "Sketch Pens", "Glue Stick", "Safety Scissors", "Scientific Calculator", "Exam Pad", "Compass", "Protractor", "Highlighter", "Stapler"
  ];

  const needed = 70 - productCount.count;
  const startIndex = productCount.count;

  for (let i = 0; i < needed; i++) {
    const name = productNames[startIndex + i] || `Product ${startIndex + i + 1}`;
    // Assign Stationery category for the new items (index 50-69)
    const category = (startIndex + i >= 50 && startIndex + i < 70) 
      ? "Stationery" 
      : categories[Math.floor(Math.random() * (categories.length - 1))];
    const price = Math.floor(Math.random() * 500) + 20;
    const stock = Math.floor(Math.random() * 80) + 20; // Min 20, Max 100
    insert.run(name, category, price, stock);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/products", (req, res) => {
    const products = db.prepare("SELECT * FROM products").all();
    res.json(products);
  });

  app.post("/api/products", (req, res) => {
    const { name, category, price, stock } = req.body;
    const result = db.prepare("INSERT INTO products (name, category, price, stock) VALUES (?, ?, ?, ?)")
      .run(name, category, price, stock);
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/products/:id", (req, res) => {
    const { id } = req.params;
    const { name, category, price, stock } = req.body;
    db.prepare("UPDATE products SET name = ?, category = ?, price = ?, stock = ? WHERE id = ?")
      .run(name, category, price, stock, id);
    res.json({ success: true });
  });

  app.delete("/api/products/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM products WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/bills", (req, res) => {
    const bills = db.prepare("SELECT * FROM bills ORDER BY date DESC").all();
    res.json(bills);
  });

  app.get("/api/bills/:id", (req, res) => {
    const { id } = req.params;
    const bill = db.prepare("SELECT * FROM bills WHERE id = ?").get(id);
    const items = db.prepare("SELECT * FROM bill_items WHERE bill_id = ?").all(id);
    if (!bill) {
      return res.status(404).json({ error: "Bill not found" });
    }
    res.json({ ...bill, items });
  });

  app.post("/api/bills", (req, res) => {
    const { items, total_amount, customer_name, customer_phone } = req.body;
    
    const transaction = db.transaction(() => {
      const billResult = db.prepare("INSERT INTO bills (total_amount, customer_name, customer_phone) VALUES (?, ?, ?)")
        .run(total_amount, customer_name || null, customer_phone || null);
      const billId = billResult.lastInsertRowid;

      const insertItem = db.prepare(`
        INSERT INTO bill_items (bill_id, product_id, product_name, price, quantity, total)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const updateStock = db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?");

      for (const item of items) {
        insertItem.run(billId, item.id, item.name, item.price, item.quantity, item.price * item.quantity);
        updateStock.run(item.quantity, item.id);
      }

      return billId;
    });

    const billId = transaction();
    res.json({ id: billId });
  });

  app.get("/api/top-selling", (req, res) => {
    const topSelling = db.prepare(`
      SELECT product_name, SUM(quantity) as total_quantity 
      FROM bill_items 
      GROUP BY product_id 
      ORDER BY total_quantity DESC 
      LIMIT 5
    `).all();
    res.json(topSelling);
  });

  app.get("/api/stats", (req, res) => {
    const totalProducts = db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number };
    const todaySales = db.prepare("SELECT SUM(total_amount) as total FROM bills WHERE date >= date('now', 'start of day')").get() as { total: number };
    const totalBills = db.prepare("SELECT COUNT(*) as count FROM bills").get() as { count: number };
    const lowStock = db.prepare("SELECT COUNT(*) as count FROM products WHERE stock <= 20").get() as { count: number };
    
    res.json({
      totalProducts: totalProducts.count,
      todaySales: todaySales.total || 0,
      totalBills: totalBills.count,
      lowStock: lowStock.count
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
