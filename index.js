// Require Mongoose
const mongoose = require("mongoose");

// Define a schema
const Schema = mongoose.Schema;
const express = require("express");
const app = express();
const PORT = 5000;
const DATABASE_URL = "mongodb+srv://orderappuser:orderapppassword@orderapp.wypnkci.mongodb.net/?retryWrites=true&w=majority";
app.use(express.json());

main().catch((err) => console.log(err));
async function main() {
  await mongoose.connect(DATABASE_URL);
}

const CustomerSchema = new Schema({
  customerName: { type: String, required: true },
  email: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  city: { type: String, required: true },
});
const Customer = mongoose.model("Customer", CustomerSchema);

const OrderSchema = new Schema({
  productName: { type: String, required: true },
  quantity: { type: String, required: true },
  pricing: { type: String, required: true },
  mrp: { type: String, required: true },
  customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
});
const Order = mongoose.model("Order", OrderSchema);

const ShipmentSchema = new Schema({
  address: { type: String, required: true },
  city: { type: String, required: true },
  pincode: { type: String, required: true },
  purchaseOrderId: { type: Schema.Types.ObjectId, ref: "Order" },
  customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
});
const Shipment = mongoose.model("Shipment", ShipmentSchema);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/customer", async (req, res) => {
  const customer = new Customer({
    customerName: req.body.customerName,
    city: req.body.city,
    mobileNumber: req.body.mobileNumber,
    email: req.body.email,
  });

  await customer.save();
  res.status(200).send(customer._id);
});

app.post("/order", async (req, res) => {
  if (req.body.pricing > req.body.mrp)
    res.status(400).send("Pricing more than MRP");
  const order = new Order({
    productName: req.body.productName,
    quantity: req.body.quantity,
    pricing: req.body.pricing,
    mrp: req.body.mrp,
    customerId: req.body.customerId,
  });

  await order.save();
  res.status(200).send(order._id);
});

app.post("/shipment", async (req, res) => {
  const purchaseOrder = await Order.findById(req.body.purchaseOrderId);
  const customerID = purchaseOrder.customerId.toString();
  const shipment = new Shipment({
    address: req.body.address,
    city: req.body.city,
    pincode: req.body.pincode,
    customerId: customerID,
    purchaseOrderId: req.body.purchaseOrderId,
  });

  await shipment.save();
  res.status(200).send(shipment._id);
});

app.get("/shipment/:city", async (req, res) => {
  const city = req.params.city;
  const shipmentDetails = await Customer.aggregate([
    {
      $match: {
        city: city,
      },
    },
    {
      $lookup: {
        from: "shipments",
        localField: "_id",
        foreignField: "customerId",
        as: "shipments",
      },
    },
    {
      $unset: ["city", "_id", "customerName", "email", "mobileNumber", "__v"],
    },
  ]).exec();

  res.status(200).send(shipmentDetails);
});

app.get("/allPurchaseOrders", async (req, res) => {
  const allPurchaseOrders = await Customer.aggregate([
    {
      $lookup: {
        from: "orders",
        localField: "_id",
        foreignField: "customerId",
        as: "purchaseOrder",
      },
    },
  ]).exec();

  res.status(200).send(allPurchaseOrders);
});

app.get("/allPurchaseShipmentOrders", async (req, res) => {
  const allPurchaseShipmentOrders = await Customer.aggregate([
    {
      $lookup: {
        from: "orders",
        localField: "_id",
        foreignField: "customerId",
        as: "purchaseOrders",
        pipeline: [
          {
            $lookup: {
              from: "shipments",
              localField: "_id",
              foreignField: "purchaseOrderId",
              as: "shipmentDetail",
            },
          },
        ],
      },
    },
  ]).exec();

  res.status(200).send(allPurchaseShipmentOrders);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
