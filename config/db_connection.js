const mongoose = require("mongoose");

async function connection() {
  try {
    const conn = await mongoose.connect("mongodb+srv://somgorai726_db_user:ehVPJVanJi0RBvoi@cluster0.vswmnvh.mongodb.net/users?appName=Cluster0");

    console.log("MongoDB connected:", conn.connection.host);

    return conn;
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
}

module.exports = connection;