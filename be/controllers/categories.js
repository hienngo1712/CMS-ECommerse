const prisma = require("../prisma/client");

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
      if (error.code === "P2002") {
        return res.status(400).json({ error: "Slug đã tồn tại" });
      }
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
        isDeleted: false,
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
      const category = await prisma.category.findFirst({
        where: {
          id: Number(id),
          isDeleted: false,
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
      res.status(500).json({
        error: "Internal server error",
      });
    }
  },
  updateCategory: async (req,res) =>{
    try{
      const {id} = req.params;
      const {name,slug,isActive} = req.body;
      const existing = await prisma.category.findFirst({
        where: {
          id: Number(id),
          isDeleted: false,
        },
      });
      if(!existing){
        return res.status(404).json({
          message: "Category not found"
        });
      }
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
      if (error.code === "P2002") {
        return res.status(400).json({ error: "Slug đã tồn tại" });
      }
      console.error(error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  },
  deleteCategory: async (req,res) =>{
    try{
      const {id} = req.params;
      const existing = await prisma.category.findFirst({
        where: {
          id: Number(id),
          isDeleted: false,
        },
      });
      if(!existing){
        return res.status(404).json({
          message: "Category not found"
        });
      }
      // Soft delete: sản phẩm thuộc danh mục này vẫn được giữ lại.
      await prisma.category.update({
        where: {
          id: Number(id),
        },
        data: {
          isDeleted: true,
        },
      });
      res.json({
        msg: "Category deleted"
      })
    }catch(error){
      console.error(error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }
};

module.exports = categoriesControllers;