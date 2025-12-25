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

  getCategories: async (req,res) => {
    try{
      let page = parseInt(req.query.page, 10) || 1;
      let limit = parseInt(req.query.limit, 10) || 10;
      const search = req.query.search || "";
      const isActive = req.query.isActive;
      if (page < 1 ) page = 1;
      if (limit < 1 ) limit = 10;
      if (limit >100) limit = 100;
      const skip = (page - 1) * limit;
      const where = {
        ...(search && {
          name: {
            contains: search,
            mode: "insensitive"
          }
        }),
        ...(isActive !== undefined && 
          isActive !== "" && {
            isActive: isActive === "true",
          }),
      }
      console.log(where);
      const [categories, total] = await Promise.all([
        prisma.category.findMany({
          skip,
          take: limit,
          where,
          orderBy:{
            id: "desc"
          }
        }),
        prisma.category.count({where}),
      ]);
      console.log(categories);
      console.log(total);
      res.json({
        data: categories,
        meta:{
          total,
          page,
          limit,
          pageCount: Math.ceil(total/limit),
        },
      });
    } catch(error) {
      console.log(error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  },
  getCategoryById: async (req,res) =>{
    try{
      const {id} = req.params;
      const category = await prisma.category.findUnique({
        where: {
          id: Number(id),
        },
      });
      if(!category){
        return res.status(404).json({
          message: "Category not found"
        })
      }
      res.json(category);
    }catch(error){
    console.error(error);
      res.status(400).json({
        error,
      });
    }
  },
  updateCategory: async (req,res) =>{
    try{
      const {id} = req.params;
      const {name,slug,isActive} = req.body;
      const updated = await prisma.category.update({
        where: {
          id: Number(id)
        },
        data: {
          name, slug, isActive
        }
      });
      res.json(updated);
    }catch(error){
      console.error(error);
      res.status(400).json({
        error,
      });
    }
  },
  deleteCategory: async (req,res) =>{
    try{
      const {id} = req.params;
      await prisma.category.delete({
        where: {
          id: Number(id),
        }
      });
      res.json({
        msg: "Category deleted"
      })
    }catch(error){
      console.error(error);
      res.status(400).json({
        error,
      });
    }
  }
};

module.exports = categoriesControllers;