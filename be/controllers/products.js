const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

const productsControllers = {
  createProduct: async(req,res)=>{
    try {
      const { name,description, categoryId, colors } = req.body;
      if(!name || !categoryId){
        return res.status(400).json({
          error: "Name and Categories are required!"
        });
      }

      const products = await prisma.product.create({
        data:{
          name,
          description,
          categoryId,
          colors:{
            create: (colors || []).map((c)=>({
              color: c.color,
              colorCode: c.colorCode,
              images:{
                create: (c.images || []).map((img,index) => ({
                  imageUrl: img.imageUrl,
                  order: index
                }))
              },
              variants:{
                create: (c.variants || []).map(v => ({
                  size: v.size,
                  price: parseFloat(v.price),
                  stock: parseInt(v.stock)
                }))
              }
            }))
          }
        },
        include:{
          colors:{
            include:{
              variants: true,
            }
          }
        }
      });
      res.status(201).json(products);
    } catch (error) {
      console.error("Create product error", error);
      res.status(500).json({
        error:"Internal server errors"
      })
    }
  },
};

module.exports = productsControllers;