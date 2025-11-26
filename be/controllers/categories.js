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
            constains: search,
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
  }
};

module.exports = categoriesControllers;