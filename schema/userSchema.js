const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  maker: String,
  model: String,
  fuel_type: String,
  transmission: String,
  engine: Object,
  features: [String],
  sunroof: Boolean,
  airbags: Number,
  price: Number,
  owners:[{
    name: String,
    purchase_date: String,
    location: String
  }],
  service_history:[{
    date:String,
    service_type: String,
    cost: Number
  }]
});

module.exports = mongoose.model("User", userSchema);


// userSchema.index({"owners.location":1});

userSchema.index({"owners.location":"text"},{
    weights:{
        "owners.location": 5,
        "oweners.name": 1
    }
})