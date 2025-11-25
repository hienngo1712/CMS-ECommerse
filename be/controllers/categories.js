const {PrismaClient} = require("../generated/prisma")
const prisma = new PrismaClient();

const categoriesControllers = {
  createCategory: async (req,res) => {
    try {
      const {name, slug, isActive} = req.body;
      const newCategory = await prisma.category.create({
        data:{
          name,slug,isActive
        },
      });
      res.send(newCategory);
    } catch (error){
      console.log(error);
      res.status(400).json({error: error.message});
    }
  },
};

module.exports = categoriesControllers;